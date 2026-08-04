import Link from "next/link";
import { BellRing, Siren } from "lucide-react";
import { redirect } from "next/navigation";
import { OSCard } from "@/components/OSCard";
import { RefreshDashboardButton } from "@/components/RefreshDashboardButton";
import { isAdminUser } from "@/lib/auth";
import { diasPendente, OrdemServico } from "@/lib/os";
import { createClient } from "@/lib/supabase/server";

type Filtros = {
  busca?: string;
  status?: string;
  tipo?: string;
  tecnico?: string;
  prioridade?: string;
};

type Alerta = {
  id: string;
  os_id: string;
  autor_id: string;
  texto: string;
  autor?: { nome?: string; papel?: string } | null;
  os?: { cliente_nome?: string; veiculo_identificador?: string } | null;
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
      .select("*, tecnico:tecnico_id(nome)")
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
        "id,os_id,autor_id,texto,criado_em,autor:autor_id(nome,papel),os:os_id(cliente_nome,veiculo_identificador)",
      )
      .is("visto_admin_em", null)
      .order("criado_em", { ascending: false }),
    s.auth.getUser(),
  ]);

  const { data: perfil } = await s
    .from("profiles")
    .select("papel,nome")
    .eq("id", user?.id)
    .maybeSingle();

  if (!isAdminUser(user?.email, perfil?.papel)) redirect("/tecnico");

  const chamados = ((alertas ?? []) as unknown as Alerta[]).filter(
    (alerta) => alerta.autor_id !== user?.id && alerta.autor?.papel !== "admin",
  );
  const amarelo = config?.alerta_amarelo_dias ?? 3;
  const vermelho = config?.alerta_vermelho_dias ?? 7;
  const todas = (ordens ?? []) as OrdemServico[];
  const termo = (searchParams.busca ?? "").toLocaleLowerCase("pt-BR");

  const filtradas = todas.filter(
    (ordem) =>
      (!termo ||
        [
          ordem.cliente_nome,
          ordem.veiculo_modelo,
          ordem.veiculo_identificador,
          ordem.local,
        ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo))) &&
      (!searchParams.status || ordem.status === searchParams.status) &&
      (!searchParams.tipo || ordem.tipo === searchParams.tipo) &&
      (!searchParams.tecnico || ordem.tecnico_id === searchParams.tecnico) &&
      (!searchParams.prioridade || ordem.prioridade === searchParams.prioridade),
  );

  const lista = [...filtradas].sort(
    (a, b) => +new Date(b.criado_em) - +new Date(a.criado_em),
  );
  const pendentes = todas.filter((ordem) => STATUS_PENDENTES.includes(ordem.status));
  const agendadas = todas.filter((ordem) => ordem.status === "agendado");
  const concluidas = todas.filter((ordem) => ordem.status === "concluido_tecnico");
  const criticas = pendentes.filter((ordem) => diasPendente(ordem) >= vermelho);
  const altas = todas.filter(
    (ordem) => ordem.prioridade === "alta" && !STATUS_ENCERRADOS.includes(ordem.status),
  );
  const altasFiltradas = lista.filter(
    (ordem) => ordem.prioridade === "alta" && !STATUS_ENCERRADOS.includes(ordem.status),
  );
  const ordensRegulares = lista.filter(
    (ordem) => ordem.prioridade !== "alta" || STATUS_ENCERRADOS.includes(ordem.status),
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
          <div className="flex items-start gap-2">
            <BellRing size={18} className="mt-0.5 shrink-0 text-amber-dark" />
            <h2 className="text-sm font-extrabold leading-5">
              {chamados.length} observação(ões) aguardando conferência
            </h2>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {chamados.slice(0, 6).map((alerta) => (
              <Link
                href={`/os/${alerta.os_id}`}
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
        <Resumo label="Prioridade alta" valor={altas.length} detalhe="atendimento prioritário" alerta />
        <Resumo label="Aguardando/reagendar" valor={pendentes.length} detalhe="aguardando contato" />
        <Resumo label="Agendadas" valor={agendadas.length} detalhe="com data definida" />
        <Resumo label="Concluídas" valor={concluidas.length} detalhe="aguardando conferência" />
        <Resumo label="Críticas" valor={criticas.length} detalhe={`há ${vermelho}+ dias`} alerta />
      </section>

      {altasFiltradas.length > 0 && (
        <BlocoPrioridade
          lista={altasFiltradas}
          amarelo={amarelo}
          vermelho={vermelho}
        />
      )}

      <section className="mt-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Ordens de serviço</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {ordensRegulares.length} resultado(s) sem prioridade alta ativa
            </p>
          </div>
          <a className="btn-secondary" href="/api/exportar">
            Exportar CSV
          </a>
        </div>

        <form className="filter-bar">
          <input
            name="busca"
            defaultValue={searchParams.busca}
            placeholder="Buscar cliente, placa, chassi ou local..."
            className="campo sm:col-span-2"
          />
          <Filtro
            name="status"
            value={searchParams.status}
            label="Todos os status"
            items={[
              ["pendente", "Pendente"],
              ["aguardando_retorno", "Aguardando retorno"],
              ["agendado", "Agendado"],
              ["reagendar", "Reagendar"],
              ["concluido", "Concluído"],
              ["concluido_tecnico", "Concluído técnico"],
              ["finalizado", "Finalizado"],
            ]}
          />
          <Filtro
            name="tipo"
            value={searchParams.tipo}
            label="Todos os serviços"
            items={[
              ["instalacao", "Instalação"],
              ["retirada", "Retirada"],
              ["manutencao", "Manutenção"],
            ]}
          />
          <Filtro
            name="prioridade"
            value={searchParams.prioridade}
            label="Toda prioridade"
            items={[
              ["alta", "Alta"],
              ["padrao", "Padrão"],
            ]}
          />
          <select
            name="tecnico"
            defaultValue={searchParams.tecnico ?? ""}
            className="campo"
          >
            <option value="">Todos os técnicos</option>
            {tecnicos?.map((tecnico) => (
              <option key={tecnico.id} value={tecnico.id}>
                {tecnico.nome}
              </option>
            ))}
          </select>
          <button className="btn-secondary" type="submit">
            Filtrar
          </button>
        </form>

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
      </section>
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
    <section className="mt-8 rounded-2xl border border-red-300 bg-red-100/60 p-3 shadow-[0_12px_35px_rgba(220,38,38,.08)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 text-red-700">
          <Siren size={19} className="mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-[.08em]">
              Prioridade alta
            </h2>
            <p className="mt-1 text-xs text-red-700/80">
              Serviços que precisam ser atendidos primeiro
            </p>
          </div>
        </div>
        <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white">
          {lista.length} {lista.length === 1 ? "OS" : "OS"}
        </span>
      </div>
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
    </section>
  );
}

function Resumo({
  label,
  valor,
  detalhe,
  alerta,
}: {
  label: string;
  valor: number;
  detalhe: string;
  alerta?: boolean;
}) {
  return (
    <div className={`stat-card min-w-0 p-4 sm:p-5 ${alerta && valor ? "border-red-500/40" : ""}`}>
      <p className="break-words text-[11px] font-medium leading-4 text-ink-muted sm:text-xs">{label}</p>
      <p className={`mt-2 text-2xl font-bold sm:mt-3 sm:text-3xl ${alerta && valor ? "text-red-700" : ""}`}>
        {valor}
      </p>
      <p className="mt-1 break-words text-[10px] leading-4 text-ink-faint sm:text-[11px]">{detalhe}</p>
    </div>
  );
}

function Filtro({
  name,
  value,
  label,
  items,
}: {
  name: string;
  value?: string;
  label: string;
  items: string[][];
}) {
  return (
    <select name={name} defaultValue={value ?? ""} className="campo">
      <option value="">{label}</option>
      {items.map(([itemValue, itemLabel]) => (
        <option key={itemValue} value={itemValue}>
          {itemLabel}
        </option>
      ))}
    </select>
  );
}
