import Link from "next/link";
import {
  BarChart3,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  LucideIcon,
  MessageCircleOff,
  TimerReset,
} from "lucide-react";
import { PainelDestaque, TemaPainel } from "@/components/PainelDestaque";
import { isAdminUser } from "@/lib/auth";
import { dataCalendarioBahia } from "@/lib/datetime";
import { diasPendente, MOTIVO_LABEL, OrdemServico, TIPO_LABEL } from "@/lib/os";
import { createClient } from "@/lib/supabase/server";

type Alerta = {
  id: string;
  os_id: string;
  texto: string;
  autor?: { nome: string } | null;
  os?: { cliente_nome: string; veiculo_identificador: string } | null;
};

export default async function PendenciasPage() {
  const s = createClient();
  const [{ data: auth }, { data: ordens }, { data: observacoes }] =
    await Promise.all([
      s.auth.getUser(),
      s.from("ordens_servico")
        .select("*,tecnico:tecnico_id(nome)")
        .order("criado_em", { ascending: true }),
      s.from("observacoes_os")
        .select(
          "id,os_id,texto,autor:autor_id(nome),os:os_id(cliente_nome,veiculo_identificador)",
        )
        .is("visto_admin_em", null)
        .order("criado_em", { ascending: false }),
    ]);
  const { data: perfil } = await s
    .from("profiles")
    .select("papel")
    .eq("id", auth.user?.id)
    .maybeSingle();

  if (!isAdminUser(auth.user?.email, perfil?.papel)) {
    return <div className="empty-state">Acesso exclusivo da administração.</div>;
  }

  const lista = (ordens ?? []) as OrdemServico[];
  const hojeBahia = dataCalendarioBahia(new Date());
  const semContato = lista.filter((o) => o.status === "pendente");
  const aguardando = lista.filter(
    (o) => o.status === "aguardando_retorno" && diasPendente(o) >= 3,
  );
  const hoje = lista.filter(
    (o) =>
      o.status === "agendado" &&
      o.data_hora_agendada &&
      dataCalendarioBahia(o.data_hora_agendada) === hojeBahia,
  );
  const concluir = lista.filter((o) => o.status === "concluido_tecnico");
  const motivos = Object.entries(MOTIVO_LABEL)
    .map(([id, label]) => ({
      id,
      label,
      total: lista.filter((o) => o.motivo_ocorrencia === id).length,
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <p className="eyebrow">CENTRAL OPERACIONAL</p>
      <h1 className="mt-2 text-3xl font-bold">Central de pendências</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Tudo que precisa de atenção reunido em uma única tela.
      </p>

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <Grupo
          titulo="OS sem contato"
          detalhe="Ainda não tiveram conversa iniciada"
          Icone={MessageCircleOff}
          tema="neutro"
          ordens={semContato}
        />
        <Grupo
          titulo="Aguardando há 3+ dias"
          detalhe="Cliente ainda não retornou"
          Icone={TimerReset}
          tema="amarelo"
          ordens={aguardando}
        />
        <Grupo
          titulo="Agendadas para hoje"
          detalhe="Atendimentos previstos para o dia"
          Icone={CalendarClock}
          tema="azul"
          ordens={hoje}
        />
        <Grupo
          titulo="Aguardando finalização"
          detalhe="Concluídas pelos técnicos"
          Icone={ClipboardCheck}
          tema="verde"
          ordens={concluir}
        />

        <PainelDestaque
          Icone={BellRing}
          titulo="Observações não visualizadas"
          descricao="Chamados enviados pelos técnicos"
          contador={observacoes?.length ?? 0}
          tema="laranja"
          className="xl:col-span-2"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {(observacoes as Alerta[] | null)?.map((o) => (
              <Link
                key={o.id}
                href={`/os/${o.os_id}`}
                className="rounded-lg border border-orange-200 bg-orange-50/35 p-3 text-xs transition hover:border-orange-400 hover:bg-orange-50"
              >
                <b className="break-words">
                  {o.os?.cliente_nome} · {o.os?.veiculo_identificador}
                </b>
                <span className="mt-1 block truncate text-ink-muted">
                  {o.autor?.nome}: {o.texto}
                </span>
              </Link>
            ))}
            {!observacoes?.length && <Vazio />}
          </div>
        </PainelDestaque>

        <PainelDestaque
          Icone={BarChart3}
          titulo="Motivos mais recorrentes"
          descricao="Reagendamentos, cancelamentos e impossibilidades registrados"
          contador={motivos.reduce((total, item) => total + item.total, 0)}
          tema="roxo"
          className="xl:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {motivos.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-violet-200 bg-violet-50/45 p-4"
              >
                <p className="text-xs text-violet-800/75">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-violet-800">
                  {item.total}
                </p>
              </div>
            ))}
            {motivos.length === 0 && <Vazio />}
          </div>
        </PainelDestaque>
      </div>
    </div>
  );
}

function Grupo({
  titulo,
  detalhe,
  Icone,
  tema,
  ordens,
}: {
  titulo: string;
  detalhe: string;
  Icone: LucideIcon;
  tema: TemaPainel;
  ordens: OrdemServico[];
}) {
  return (
    <PainelDestaque
      Icone={Icone}
      titulo={titulo}
      descricao={detalhe}
      contador={ordens.length}
      tema={tema}
    >
      <div className="space-y-2">
        {ordens.slice(0, 10).map((o) => (
          <Link
            key={o.id}
            href={`/os/${o.id}`}
            className="block rounded-xl border border-base-border bg-white p-3 transition hover:-translate-y-0.5 hover:border-amber hover:shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <b className="block min-w-0 break-words text-sm">
                {o.cliente_nome}
              </b>
              <span className={`service-label service-${o.tipo}`}>
                {TIPO_LABEL[o.tipo]}
              </span>
            </div>
            <span className="mt-1 block break-words text-xs leading-5 text-ink-muted">
              {o.veiculo_identificador} · {o.tecnico?.nome ?? "Sem técnico"}
            </span>
          </Link>
        ))}
        {ordens.length === 0 && <Vazio />}
      </div>
    </PainelDestaque>
  );
}

function Vazio() {
  return (
    <p className="py-4 text-center text-xs text-ink-faint">
      Nenhuma pendência nesta categoria.
    </p>
  );
}
