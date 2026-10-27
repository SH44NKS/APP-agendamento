import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { ConferenciaObservacoes, type ObservacaoConferencia } from "@/components/ConferenciaObservacoes";
import { isAdminUser } from "@/lib/auth";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const STATUS_ENCERRADOS = ["finalizado", "concluido", "cancelado"];

type ObservacaoBanco = ObservacaoConferencia & {
  autor_id: string;
  visto_admin_em: string | null;
  autor?: { nome?: string | null; papel?: string | null } | null;
};

export default async function ConferenciaPage() {
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  const [{ data: perfil }, { data: observacoes }] = await Promise.all([
    supabase.from("profiles").select("papel").eq("id", user?.id).maybeSingle(),
    supabase.from("observacoes_os").select("id,os_id,autor_id,texto,criado_em,visto_admin_em,autor:autor_id(nome,papel),os:os_id(cliente_nome,veiculo_identificador,veiculo_modelo,local,status)").order("criado_em", { ascending: false }),
  ]);

  if (!isAdminUser(user?.email, perfil?.papel)) redirect("/tecnico");

  const ultimaPorOs = new Map<string, ObservacaoBanco>();
  for (const observacao of (observacoes ?? []) as unknown as ObservacaoBanco[]) {
    if (!ultimaPorOs.has(observacao.os_id)) ultimaPorOs.set(observacao.os_id, observacao);
  }
  const pendentes = [...ultimaPorOs.values()].filter((observacao) =>
    observacao.autor_id !== user?.id &&
    observacao.autor?.papel !== "admin" &&
    !observacao.visto_admin_em &&
    !STATUS_ENCERRADOS.includes(observacao.os?.status ?? ""),
  );

  return <div><p className="eyebrow">CENTRAL OPERACIONAL</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Conferência de observações</h1><p className="mt-2 text-sm text-ink-muted">Responda ou marque como lida sem abrir a ordem de serviço.</p></div><span className="flex items-center gap-2 rounded-lg border border-amber bg-amber/10 px-3 py-2 text-sm font-bold text-amber-dark"><BadgeCheck size={17}/>{pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}</span></div><section className="mt-7"><ConferenciaObservacoes observacoes={pendentes} /></section></div>;
}
