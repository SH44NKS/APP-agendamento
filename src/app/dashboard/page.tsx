import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OSCard } from "@/components/OSCard";
import { diasPendente, OrdemServico } from "@/lib/os";
import { isAdminUser } from "@/lib/auth";
import { BellRing } from "lucide-react";
type Filtros = {
  busca?: string;
  status?: string;
  tipo?: string;
  tecnico?: string;
  prioridade?: string;
};
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Filtros;
}) {
  const s = createClient();
  const [
    { data: ordens },
    { data: tecnicos },
    { data: config },
    { data: alertas },
    {
      data: { user },
    },
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
    s.from("observacoes_os").select("id,os_id,autor_id,texto,criado_em,autor:autor_id(nome,papel),os:os_id(cliente_nome,veiculo_identificador)").is("visto_admin_em",null).order("criado_em",{ascending:false}),
    s.auth.getUser(),
  ]);
  const { data: perfil } = await s
    .from("profiles")
    .select("papel,nome")
    .eq("id", user?.id)
    .maybeSingle();
  if (!isAdminUser(user?.email, perfil?.papel)) return <AcessoTecnico />;
  const chamados=(alertas??[]).filter((a:any)=>a.autor_id!==user?.id&&a.autor?.papel!=="admin");
  const amarelo = config?.alerta_amarelo_dias ?? 3,
    vermelho = config?.alerta_vermelho_dias ?? 7;
  const todas = (ordens ?? []) as OrdemServico[],
    termo = (searchParams.busca ?? "").toLowerCase();
  const filtradas = todas.filter(
    (o) =>
      (!termo ||
        [
          o.cliente_nome,
          o.veiculo_modelo,
          o.veiculo_identificador,
          o.local,
        ].some((v) => v.toLowerCase().includes(termo))) &&
      (!searchParams.status || o.status === searchParams.status) &&
      (!searchParams.tipo || o.tipo === searchParams.tipo) &&
      (!searchParams.tecnico || o.tecnico_id === searchParams.tecnico) &&
      (!searchParams.prioridade || o.prioridade === searchParams.prioridade),
  );
  const lista = [...filtradas].sort(
    (a, b) => Number(b.prioridade === "alta") - Number(a.prioridade === "alta"),
  );
  const pendentes = todas.filter((o) => ["aguardando_retorno","pendente","reagendar"].includes(o.status)),
    agendadas = todas.filter((o) => o.status === "agendado"),
    concluidas = todas.filter((o) => o.status === "concluido_tecnico"),
    criticas = pendentes.filter((o) => diasPendente(o) >= vermelho),
    altas = todas.filter(
      (o) =>
        o.prioridade === "alta" &&
        !["finalizado", "concluido", "cancelado"].includes(o.status),
    );
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">CENTRAL OPERACIONAL</p>
          <h1 className="mt-2 text-3xl font-bold">
            Bom trabalho, {(perfil?.nome || user?.user_metadata?.full_name || "gestor").split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Acompanhe prioridades e mantenha a agenda em movimento.
          </p>
        </div>
        <Link href="/os/novo" className="btn-primary">
          + Nova ordem
        </Link>
      </div>
      {chamados.length>0&&<section className="mt-7 rounded-xl border border-amber bg-amber/10 p-4"><div className="flex items-center gap-2"><BellRing size={18} className="text-amber-dark"/><h2 className="text-sm font-extrabold">{chamados.length} observação(ões) aguardando conferência</h2></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{chamados.slice(0,6).map((a:any)=><Link href={`/os/${a.os_id}`} key={a.id} className="rounded-lg border border-amber/40 bg-white p-3 text-xs hover:border-amber"><b className="block truncate">{a.os?.cliente_nome??"Ordem de serviço"} · {a.os?.veiculo_identificador??""}</b><span className="mt-1 block truncate text-ink-muted">{a.autor?.nome??"Técnico"}: {a.texto}</span></Link>)}</div></section>}
      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Resumo
          label="Prioridade alta"
          valor={altas.length}
          detalhe="atendimento prioritário"
          alerta
        />
        <Resumo
          label="Aguardando/reagendar"
          valor={pendentes.length}
          detalhe="aguardando contato"
        />
        <Resumo
          label="Agendadas"
          valor={agendadas.length}
          detalhe="com data definida"
        />
        <Resumo
          label="Concluídas"
          valor={concluidas.length}
          detalhe="total registrado"
        />
        <Resumo
          label="Críticas"
          valor={criticas.length}
          detalhe={`há ${vermelho}+ dias`}
          alerta
        />
      </section>
      {altas.length > 0 && (
        <Bloco
          titulo="Prioridade alta"
          subtitulo="Serviços marcados para atendimento prioritário"
          lista={altas}
          amarelo={amarelo}
          vermelho={vermelho}
        />
      )}{" "}
      {criticas.length > 0 && (
        <Bloco
          titulo="Atrasos críticos"
          subtitulo={`Sem agendamento há ${vermelho}+ dias`}
          lista={criticas}
          amarelo={amarelo}
          vermelho={vermelho}
        />
      )}
      <section className="mt-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Ordens de serviço</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {lista.length} resultado(s) · prioridade alta sempre primeiro
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
            {tecnicos?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          <button className="btn-secondary" type="submit">
            Filtrar
          </button>
        </form>
        <div className="card-grid mt-5">
          {lista.map((o) => (
            <OSCard key={o.id} os={o} amarelo={amarelo} vermelho={vermelho} />
          ))}
          {lista.length === 0 && (
            <div className="empty-state">Nenhuma ordem encontrada.</div>
          )}
        </div>
      </section>
    </div>
  );
}
function Bloco({
  titulo,
  subtitulo,
  lista,
  amarelo,
  vermelho,
}: {
  titulo: string;
  subtitulo: string;
  lista: OrdemServico[];
  amarelo: number;
  vermelho: number;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title text-red-300">● {titulo}</h2>
        <span className="text-xs text-ink-muted">{subtitulo}</span>
      </div>
      <div className="card-grid">
        {lista.slice(0, 6).map((o) => (
          <OSCard key={o.id} os={o} amarelo={amarelo} vermelho={vermelho} />
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
    <div className={`stat-card ${alerta && valor ? "border-red-500/40" : ""}`}>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p
        className={`mt-3 text-3xl font-bold ${alerta && valor ? "text-red-300" : ""}`}
      >
        {valor}
      </p>
      <p className="mt-1 text-[11px] text-ink-faint">{detalhe}</p>
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
      {items.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
function AcessoTecnico() {
  return (
    <div className="empty-state">
      <p>Esta é a área da gestão.</p>
      <Link className="btn-primary mt-4 inline-flex" href="/tecnico">
        Abrir meus serviços
      </Link>
    </div>
  );
}
