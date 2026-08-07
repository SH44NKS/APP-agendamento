import Link from "next/link";
import { ListChecks } from "lucide-react";
import { FinalizationActions } from "@/components/FinalizationActions";
import { PainelDestaque } from "@/components/PainelDestaque";
import { ServicoDestaque } from "@/components/ServicoDestaque";
import { isAdminUser } from "@/lib/auth";
import { TipoServico } from "@/lib/os";
import { createClient } from "@/lib/supabase/server";

export default async function FinalizacaoPage() {
  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  const { data: perfil } = await s
    .from("profiles")
    .select("papel")
    .eq("id", user?.id)
    .maybeSingle();

  if (!isAdminUser(user?.email, perfil?.papel)) {
    return <div className="empty-state">Acesso exclusivo da administração.</div>;
  }

  const { data: ordens } = await s
    .from("ordens_servico")
    .select("*,tecnico:tecnico_id(nome)")
    .eq("status", "concluido_tecnico")
    .order("concluido_tecnico_em", { ascending: true });

  return (
    <div>
      <p className="eyebrow">CONFERÊNCIA DO DIA</p>
      <h1 className="mt-2 text-3xl font-bold">Finalização de serviços</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Confira as conclusões enviadas pelos técnicos. Finalize a OS ou devolva
        para reagendamento.
      </p>

      <PainelDestaque
        Icone={ListChecks}
        titulo="Aguardando conferência"
        descricao="Serviços concluídos pela equipe técnica"
        contador={ordens?.length ?? 0}
        tema="verde"
        className="mt-7"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordens?.map((o) => (
            <article
              key={o.id}
              className="overflow-hidden rounded-xl border border-base-border bg-white shadow-[0_10px_30px_rgba(17,24,39,.06)]"
            >
              <ServicoDestaque tipo={o.tipo as TipoServico} />
              <div className="p-4">
                <Link href={`/os/${o.id}`} className="block">
                  <h2 className="break-words text-base font-bold">
                    {o.cliente_nome}
                  </h2>
                  <p className="mt-1 break-words font-mono text-xs leading-5 text-ink-muted">
                    {o.veiculo_modelo} · {o.veiculo_identificador}
                  </p>
                  <p className="mt-3 text-xs text-ink-muted">
                    Técnico: {o.tecnico?.nome ?? "Não informado"}
                  </p>
                </Link>
                <FinalizationActions osId={o.id} />
              </div>
            </article>
          ))}
          {!ordens?.length && (
            <div className="empty-state">Nenhum serviço aguardando finalização.</div>
          )}
        </div>
      </PainelDestaque>
    </div>
  );
}
