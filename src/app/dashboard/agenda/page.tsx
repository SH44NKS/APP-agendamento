import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { AgendaOperacional } from "@/components/AgendaOperacional";
import { PainelDestaque } from "@/components/PainelDestaque";
import { isAdminUser } from "@/lib/auth";
import { OrdemServico } from "@/lib/os";
import { createClient } from "@/lib/supabase/server";

export default async function AgendaPage() {
  const s = createClient();
  const { data: auth } = await s.auth.getUser();
  const { data: perfil } = await s
    .from("profiles")
    .select("papel")
    .eq("id", auth.user?.id)
    .maybeSingle();
  const admin = isAdminUser(auth.user?.email, perfil?.papel);

  let query = s
    .from("ordens_servico")
    .select("*,tecnico:tecnico_id(nome)")
    .not("data_hora_agendada", "is", null)
    .neq("status", "cancelado")
    .order("data_hora_agendada");
  if (!admin) query = query.eq("tecnico_id", auth.user?.id);
  const { data: ordens } = await query;

  return (
    <div>
      {!admin && (
        <Link href="/tecnico" className="btn-secondary mb-5 inline-flex">
          <ArrowLeft size={16} />
          Voltar para meus serviços
        </Link>
      )}
      <p className="eyebrow">PLANEJAMENTO</p>
      <h1 className="mt-2 text-3xl font-bold">Agenda operacional</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {admin
          ? "Visualize a equipe e identifique horários sobrepostos."
          : "Busque e organize seus serviços por data, nome, placa ou status."}
      </p>

      <PainelDestaque
        Icone={CalendarDays}
        titulo="Calendário de serviços"
        descricao="Consulte por dia, semana ou mês"
        contador={ordens?.length ?? 0}
        tema="azul"
        className="mt-7"
        conteudoClassName="p-3 sm:p-5"
      >
        <AgendaOperacional
          ordens={(ordens ?? []) as OrdemServico[]}
          tecnico={!admin}
        />
      </PainelDestaque>
    </div>
  );
}
