import Link from "next/link";
import {
  BellRing,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardList,
  ChevronRight,
  Clock3,
  Flame,
  Siren,
} from "lucide-react";
import { redirect } from "next/navigation";
import { OSCard } from "@/components/OSCard";
import { BuscaOrdens } from "@/components/BuscaOrdens";
import { PainelDestaque, TemaPainel } from "@/components/PainelDestaque";
import { RefreshDashboardButton } from "@/components/RefreshDashboardButton";
import { isAdminUser } from "@/lib/auth";
import { diasSemMovimento, OrdemServico } from "@/lib/os";
import { createClient, getAuthUser } from "@/lib/supabase/server";

type Filtros = {
  busca?: string;
  status?: string;
  tipo?: string;
  tecnico?: string;
  prioridade?: string;
  resumo?: string;
};

type Alerta = {
  id: string;
  os_id: string;
  autor_id: string;
  texto: string;
  autor?: { nome?: string; papel?: string } | null;
  os?: {
    cliente_nome?: string;
    veiculo_identificador?: string;
    status?: string;
  } | null;
};

const STATUS_ENCERRADOS = ["finalizado", "concluido", "cancelado"];
const STATUS_PENDENTES = ["aguardando_retorno", "pendente", "reagendar"];

export default async function DashboardPage({ searchParams }: { searchParams: Filtros }) {
  const s = createClient();
  const [
    { data: ordens },
    { data: tecnicos },
    { data: config },
    { data: alertas },
    { data: { user } },
  ] = await Promise.all([
    s
      .from("ordens_servico")
      .select("*, tecnico:tecnico_id(nome), observacoes_os(criado_em)")
      .order("criado_em", { ascending: false }),
    s
      .from("profiles")
      .select("id,nome")
      .eq("papel", "tecnico")
      .eq("ativo", true)
      .order("nome"),
    s.from("configuracoes").select("*").single(),
    s
      .from("observacoes_os")
      .select(
        "id,os_id,autor_id,texto,criado_em,autor:autor_id(nome,papel),os:os_id(cliente_nome,veiculo_identificador,status)",
      )
      .order("criado_em", { ascending: false }),
    getAuthUser(s),
  ]);

  const { data: perfil } = await s
    .from("profiles")
    .select("papel,nome")
    .eq("id", user?.id)
    .maybeSingle();

  if (!isAdminUser(user?.email, perfil?.papel)) redirect("/tecnico");

  const ultimaMensagemPorOs = new Map<string, Alerta>();
  for (const alerta of (alertas ?? []) as unknown as Alerta[]) {
    if (!ultimaMensagemPorOs.has(alerta.os_id)) ultimaMensagemPorOs.set(alerta.os_id, alerta);
  }
  const chamados = [...ultimaMensagemPorOs.values()].filter(
    (alerta) =>
      alerta.autor_id !== user?.id &&
      alerta.autor?.papel !== "admin" &&
      !STATUS_ENCERRADOS.includes(alerta.os?.status ?? ""),
  );
  const amarelo = config?.alerta_amarelo_dias ?? 3;
  const vermelho = config?.alerta_vermelho_dias ?? 7;
  const todas = (ordens ?? []) as OrdemServico[];
  const termo = (searchParams.busca ?? "").toLocaleLowerCase("pt-BR");
  const statusSelecionado = searchParams.status ?? "todos";
  const tipoSelecionado = searchParams.tipo ?? "todos";
  const resumoSelecionado = searchParams.resumo;

  const filtradas = todas.filter(
    (ordem) =>
      (!termo ||
        [
          ordem.cliente_nome,
          ordem.veiculo_modelo,
          ordem.veiculo_identificador,
          ordem.local,
          ordem.consultor_nome,
        ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo))) &&
      (statusSelecionado === "todos" ||
        ordem.status === statusSelecionado ||
        (statusSelecionado === "finalizado" && ordem.status === "concluido")) &&
      (tipoSelecionado === "todos" || ordem.tipo === tipoSelecionado) &&
      (!searchParams.tecnico || ordem.tecnico_id === searchParams.tecnico) &&
      (!searchParams.prioridade || ordem.prioridade === searchParams.prioridade) &&
      correspondeResumo(ordem, resumoSelecionado, vermelho),
  );

  const lista = [...filtradas].sort(
    (a, b) => +new Date(b.criado_em) - +new Date(a.criado_em),
  );
  const pendentes = todas.filter((ordem) => STATUS_PENDENTES.includes(ordem.status));
  const agendadas = todas.filter((ordem) => ordem.status === "agendado");
  const concluidas = todas.filter((ordem) => ordem.status === "concluido_tecnico");
  const criticas = pendentes.filter(
    (ordem) => diasSemMovimento(ordem) > vermelho,
  );
  const altas = todas.filter(
    (ordem) => ordem.prioridade === "alta" && !STATUS_ENCERRADOS.includes(ordem.status),
  );
  const altasFiltradas = resumoSelecionado
    ? []
    : lista.filter(
        (ordem) =>
          ordem.prioridade === "alta" &&
          !STATUS_ENCERRADOS.includes(ordem.status),
      );
  const ordensRegulares = resumoSelecionado
    ? lista
    : lista.filter(
        (ordem) =>
          ordem.prioridade !== "alta" ||
          STATUS_ENCERRADOS.includes(ordem.status),
      );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">CENTRAL OPERACIONAL</p>
          <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
            Bom trabalho, {(perfil?.nome || user?.user_metadata?.full_name || "gestor").split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Acompanhe prioridades e mantenha a agenda em movimento.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <RefreshDashboardButton />
          <Link href="/os/novo" className="btn-primary flex-1 sm:flex-none">
            + Nova ordem
          </Link>
        </div>
      </div>

      {chamados.length > 0 && (
        <section className="mt-7 rounded-xl border border-amber bg-amber/10 p-4">
          <Link
            href="/dashboard/conferencia"
            className="flex items-center justify-between gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          >
            <span className="flex min-w-0 items-start gap-2">
              <BellRing size={18} className="mt-0.5 shrink-0 text-amber-dark" />
              <span className="break-words text-sm font-extrabold leading-5">
                {chamados.length} observação(ões) aguardando conferência
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-dark">
              Ver todas <ChevronRight size={15} aria-hidden="true" />
            </span>
          </Link>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {chamados.slice(0, 6).map((alerta) => (
              <Link
                href="/dashboard/conferencia"
                key={alerta.id}
                className="min-w-0 rounded-lg border border-amber/40 bg-white p-3 text-xs hover:border-amber"
              >
                <b className="block break-words">
                  {alerta.os?.cliente_nome ?? "Ordem de serviço"} · {alerta.os?.veiculo_identificador ?? ""}
                </b>
                <span className="mt-1 block break-words leading-5 text-ink-muted">
                  {alerta.autor?.nome ?? "Técnico"}: {alerta.texto}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Resumo Icone={Siren} tema="vermelho" label="Prioridade alta" valor={altas.length} detalhe="atendimento prioritário" href={hrefResumo("prioridade_alta")} />
        <Resumo Icone={Clock3} tema="amarelo" label="Aguardando/reagendar" valor={pendentes.length} detalhe="aguardando contato" href={hrefResumo("pendencias")} />
        <Resumo Icone={CalendarCheck2} tema="azul" label="Agendadas" valor={agendadas.length} detalhe="com data definida" href={hrefResumo("agendadas")} />
        <Resumo Icone={ClipboardCheck} tema="verde" label="Concluídas" valor={concluidas.length} detalhe="aguardando conferência" href={hrefResumo("concluidas")} />
        <Resumo Icone={Flame} tema="laranja" label="Críticas" valor={criticas.length} detalhe={`sem movimento por mais de ${vermelho} dias`} href={hrefResumo("criticas")} />
      </section>

      {altasFiltradas.length > 0 && (
        <BlocoPrioridade
          lista={altasFiltradas}
          amarelo={amarelo}
          vermelho={vermelho}
        />
      )}

      <PainelDestaque
        id="lista-ordens"
        Icone={ClipboardList}
        titulo="Ordens de serviço"
        descricao={
          resumoSelecionado
            ? `Lista: ${labelResumo(resumoSelecionado)}`
            : "Lista operacional conforme os filtros selecionados"
        }
        contador={ordensRegulares.length}
        tema="neutro"
        className="mt-9"
      >
        <div className="mb-4 flex justify-end">
          <a className="btn-secondary" href="/api/exportar">
            Exportar CSV
          </a>
        </div>

        <BuscaOrdens
          busca={searchParams.busca}
          status={statusSelecionado}
          tipo={tipoSelecionado}
          prioridade={searchParams.prioridade}
          tecnico={searchParams.tecnico}
          tecnicos={tecnicos ?? []}
        />

        <div className="card-grid mt-5">
          {ordensRegulares.map((ordem) => (
            <OSCard
              key={ordem.id}
              os={ordem}
              amarelo={amarelo}
              vermelho={vermelho}
            />
          ))}
          {ordensRegulares.length === 0 && (
            <div className="empty-state">Nenhuma ordem comum encontrada.</div>
          )}
        </div>
      </PainelDestaque>
    </div>
  );
}

function BlocoPrioridade({
  lista,
  amarelo,
  vermelho,
}: {
  lista: OrdemServico[];
  amarelo: number;
  vermelho: number;
}) {
  return (
    <PainelDestaque
      Icone={Siren}
      titulo="Prioridade alta"
      descricao="Serviços que precisam ser atendidos primeiro"
      contador={`${lista.length} OS`}
      tema="vermelho"
      className="mt-8"
    >
      <div className="card-grid">
        {lista.map((ordem) => (
          <OSCard
            key={ordem.id}
            os={ordem}
            amarelo={amarelo}
            vermelho={vermelho}
          />
        ))}
      </div>
    </PainelDestaque>
  );
}

function Resumo({
  Icone,
  tema,
  label,
  valor,
  detalhe,
  href,
}: {
  Icone: typeof Siren;
  tema: TemaPainel;
  label: string;
  valor: number;
  detalhe: string;
  href?: string;
}) {
  const classes: Record<TemaPainel, string> = {
    vermelho: "border-red-200 bg-gradient-to-br from-red-100 to-white text-red-800",
    laranja: "border-orange-200 bg-gradient-to-br from-orange-100 to-white text-orange-800",
    amarelo: "border-yellow-300 bg-gradient-to-br from-yellow-100 to-white text-amber-dark",
    azul: "border-blue-200 bg-gradient-to-br from-blue-100 to-white text-blue-800",
    verde: "border-emerald-200 bg-gradient-to-br from-emerald-100 to-white text-emerald-800",
    roxo: "border-violet-200 bg-gradient-to-br from-violet-100 to-white text-violet-800",
    neutro: "border-slate-200 bg-gradient-to-br from-slate-100 to-white text-slate-800",
  };
  const conteudo = (
    <div className={`relative min-w-0 overflow-hidden rounded-xl border p-4 shadow-[0_10px_30px_rgba(17,24,39,.05)] sm:p-5 ${classes[tema]}`}>
      <Icone size={58} strokeWidth={1.5} aria-hidden="true" className="pointer-events-none absolute -right-1 -top-1 opacity-10" />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <p className="break-words text-[11px] font-bold leading-4 sm:text-xs">{label}</p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-white/70">
          <Icone size={14} aria-hidden="true" />
        </span>
      </div>
      <p className="relative z-10 mt-2 text-2xl font-black sm:mt-3 sm:text-3xl">
        {valor}
      </p>
      <p className="relative z-10 mt-1 break-words text-[10px] leading-4 opacity-65 sm:text-[11px]">{detalhe}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

function hrefResumo(resumo: string) {
  const params = new URLSearchParams({ resumo, status: "todos", tipo: "todos" });
  return `/dashboard?${params.toString()}#lista-ordens`;
}

function correspondeResumo(
  ordem: OrdemServico,
  resumo: string | undefined,
  vermelho: number,
) {
  if (!resumo) return true;
  if (resumo === "prioridade_alta") {
    return (
      ordem.prioridade === "alta" &&
      !STATUS_ENCERRADOS.includes(ordem.status)
    );
  }
  if (resumo === "pendencias") return STATUS_PENDENTES.includes(ordem.status);
  if (resumo === "agendadas") return ordem.status === "agendado";
  if (resumo === "concluidas") return ordem.status === "concluido_tecnico";
  if (resumo === "criticas") {
    return (
      STATUS_PENDENTES.includes(ordem.status) &&
      diasSemMovimento(ordem) > vermelho
    );
  }
  return true;
}

function labelResumo(resumo: string) {
  const labels: Record<string, string> = {
    prioridade_alta: "Prioridade alta",
    pendencias: "Aguardando/reagendar",
    agendadas: "Agendadas",
    concluidas: "Concluídas pelo técnico",
    criticas: "Críticas",
  };
  return labels[resumo] ?? "Ordens de serviço";
}
