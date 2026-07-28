import { createClient } from "@/lib/supabase/server";
import { EquipeManager } from "@/components/EquipeManager";
import { isAdminUser } from "@/lib/auth";
export default async function EquipePage() {
  const s = createClient();
  const { data: auth } = await s.auth.getUser();
  const [{ data: perfil }, { data: pessoas }] = await Promise.all([
    s.from("profiles").select("papel").eq("id", auth.user?.id).maybeSingle(),
    s
      .from("profiles")
      .select("id,nome,email,papel,ativo,criado_em")
      .order("nome"),
  ]);
  if (!isAdminUser(auth.user?.email, perfil?.papel))
    return (
      <div className="empty-state">Acesso exclusivo da administração.</div>
    );
  return (
    <div>
      <p className="eyebrow">ACESSOS E EQUIPE</p>
      <h1 className="mt-2 text-3xl font-bold">Gerenciar usuários</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Todo novo login entra como técnico. Promova para administrador quando
        necessário.
      </p>
      <EquipeManager pessoas={pessoas ?? []} />
    </div>
  );
}
