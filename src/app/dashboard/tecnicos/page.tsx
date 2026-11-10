import { redirect } from "next/navigation";
import { TecnicosAbertos } from "@/components/TecnicosAbertos";
import { isAdminUser } from "@/lib/auth";
import type { OrdemServico } from "@/lib/os";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const STATUS_ENCERRADOS = ["finalizado", "concluido", "cancelado"];

export default async function TecnicosPage() {
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  const { data: perfil } = await supabase
    .from("profiles")
    .select("papel")
    .eq("id", user?.id)
    .maybeSingle();

  if (!isAdminUser(user?.email, perfil?.papel)) redirect("/tecnico");

  const [tecnicosResult, ordensResult] = await Promise.all([
    supabase.from("profiles").select("id,nome").eq("papel", "tecnico").eq("ativo", true).order("nome"),
    supabase.from("ordens_servico").select("*,tecnico:tecnico_id(nome),observacoes_os(criado_em)").order("criado_em", { ascending: false }),
  ]);
  const ordensAbertas = ((ordensResult.data ?? []) as OrdemServico[]).filter(
    (ordem) => !STATUS_ENCERRADOS.includes(ordem.status),
  );

  return <TecnicosAbertos tecnicos={tecnicosResult.data ?? []} ordens={ordensAbertas} />;
}
