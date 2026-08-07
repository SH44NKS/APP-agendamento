import Link from "next/link";
import { CalendarDays, ClipboardList, LogOut, Search, Siren } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { OSCard } from "@/components/OSCard";
import { PainelDestaque } from "@/components/PainelDestaque";
import { OrdemServico, STATUS_LABEL } from "@/lib/os";
import { createClient } from "@/lib/supabase/server";

type Filtros = { busca?: string; status?: string };

const STATUS_ENCERRADOS = ["finalizado", "concluido", "cancelado"];

export default async function TecnicoPage({ searchParams }: { searchParams: Filtros }) {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  const [{ data: ordens }, { data: perfil }] = await Promise.all([
    s
      .from("ordens_servico")
      .select("*")
      .eq("tecnico_id", user?.id)
      .order("criado_em", { ascending: false }),
    s.from("profiles").select("nome").eq("id", user?.id).single(),
  ]);

  const busca = (searchParams.busca ?? "").trim().toLocaleLowerCase("pt-BR");
  const lista = ((ordens ?? []) as OrdemServico[])
    .filter((ordem) => !searchParams.status || ordem.status === searchParams.status)
    .filter(
      (ordem) =>
        !busca ||
        [
          ordem.cliente_nome,
          ordem.veiculo_identificador,
          ordem.veiculo_modelo,
          ordem.local,
        ].some((valor) => valor?.toLocaleLowerCase("pt-BR").includes(busca)),
    )
    .sort((a, b) => +new Date(b.criado_em) - +new Date(a.criado_em));

  const prioritarias = lista.filter(
    (ordem) => ordem.prioridade === "alta" && !STATUS_ENCERRADOS.includes(ordem.status),
  );
  const demais = lista.filter(
    (ordem) => !prioritarias.some((prioritaria) => prioritaria.id === ordem.id),
  );

  return (
    <main className="min-h-screen bg-base-bg px-3 py-4 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between gap-3 rounded-xl border border-base-border bg-white p-3 shadow-sm">
          <Link href="/tecnico" className="flex min-w-0 items-center gap-3">
            <span className="brand-mark">FE</span>
            <div className="min-w-0">
              <b className="block truncate text-sm font-extrabold text-gray-900">APP agendamento</b>
              <p className="font-mono text-[9px] uppercase tracking-[.14em] text-ink-muted">Foco & Escudo</p>
            </div>
          </Link>
          <div className="w-10 shrink-0">
            <LogoutButton compact icon={<LogOut size={16} />} />
          </div>
        </header>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-3 sm:mt-9">
          <div className="min-w-0">
            <p className="eyebrow">MEUS SERVIÇOS</p>
            <h1 className="mt-2 break-words text-2xl font-extrabold">
              Olá, {perfil?.nome?.split(" ")[0] ?? "técnico"}
            </h1>
          </div>
          <Link href="/dashboard/agenda" className="btn-secondary shrink-0">
            <CalendarDays size={16} />
            Agenda
          </Link>
        </div>
        <p className="mt-2 text-sm text-ink-muted">As OS mais novas aparecem primeiro.</p>

        <form className="mt-5 grid gap-2 rounded-xl border border-base-border bg-white p-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              name="busca"
              defaultValue={searchParams.busca}
              className="campo !pl-10"
              placeholder="Nome, placa, chassi ou modelo"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <select
              name="status"
              defaultValue={searchParams.status ?? ""}
              className="campo"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL)
                .filter(([id]) => !["atrasado", "critico", "concluido"].includes(id))
                .map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
            </select>
            <button type="submit" className="btn-secondary">Filtrar</button>
          </div>
        </form>

        <p className="mt-4 text-xs text-ink-muted">{lista.length} resultado(s)</p>

        {prioritarias.length > 0 && (
          <PainelDestaque
            Icone={Siren}
            titulo="Prioridade alta"
            descricao="Atenda estes serviços primeiro"
            contador={prioritarias.length}
            tema="vermelho"
            className="mt-4"
            conteudoClassName="p-3"
          >
            <div className="flex flex-col gap-3">
              {prioritarias.map((ordem) => <OSCard key={ordem.id} os={ordem} />)}
            </div>
          </PainelDestaque>
        )}

        {demais.length > 0 && (
          <PainelDestaque
            Icone={ClipboardList}
            titulo={prioritarias.length > 0 ? "Demais ordens" : "Ordens de serviço"}
            descricao="Serviços organizados do mais novo para o mais antigo"
            contador={demais.length}
            tema="neutro"
            className="mt-6"
            conteudoClassName="p-3"
          >
            <div className="flex flex-col gap-3">
              {demais.map((ordem) => <OSCard key={ordem.id} os={ordem} />)}
            </div>
          </PainelDestaque>
        )}

        {lista.length === 0 && (
          <div className="empty-state mt-3">Nenhuma ordem encontrada com esses filtros.</div>
        )}
      </div>
    </main>
  );
}
