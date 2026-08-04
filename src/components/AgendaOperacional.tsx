"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { OrdemServico, STATUS_LABEL, TIPO_LABEL } from "@/lib/os";

type Visao = "dia" | "semana" | "mes";

export function AgendaOperacional({
  ordens,
  tecnico,
}: {
  ordens: OrdemServico[];
  tecnico: boolean;
}) {
  const [visao, setVisao] = useState<Visao>("semana");
  const [referencia, setReferencia] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");

  const intervalo = useMemo(() => {
    if (visao === "dia") {
      return { start: startOfDay(referencia), end: endOfDay(referencia) };
    }
    if (visao === "semana") {
      return {
        start: startOfWeek(referencia, { weekStartsOn: 1 }),
        end: endOfWeek(referencia, { weekStartsOn: 1 }),
      };
    }
    return { start: startOfMonth(referencia), end: endOfMonth(referencia) };
  }, [referencia, visao]);

  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const filtradas = ordens.filter(
    (ordem) =>
      (!status || ordem.status === status) &&
      (!termo ||
        [
          ordem.cliente_nome,
          ordem.veiculo_identificador,
          ordem.veiculo_modelo,
          ordem.local,
        ].some((valor) => valor?.toLocaleLowerCase("pt-BR").includes(termo))),
  );
  const itens = filtradas.filter(
    (ordem) =>
      ordem.data_hora_agendada &&
      isWithinInterval(new Date(ordem.data_hora_agendada), intervalo),
  );
  const dias: Date[] = [];
  for (let dia = intervalo.start; dia <= intervalo.end; dia = addDays(dia, 1)) {
    dias.push(dia);
  }

  function mover(valor: number) {
    setReferencia((atual) =>
      addDays(atual, valor * (visao === "dia" ? 1 : visao === "semana" ? 7 : 30)),
    );
  }

  return (
    <div>
      <div className="mt-6 grid gap-2 rounded-xl border border-base-border bg-white p-3 sm:grid-cols-[1fr_190px]">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            className="campo !pl-10"
            placeholder="Buscar nome, placa, chassi ou modelo"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="campo"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL)
            .filter(([id]) => !["atrasado", "critico", "concluido"].includes(id))
            .map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
        </select>
      </div>

      {termo ? (
        <ResultadosBusca ordens={filtradas} tecnico={tecnico} />
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-base-border bg-white p-3">
            <div className="flex gap-1">
              {(["dia", "semana", "mes"] as Visao[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setVisao(item)}
                  className={visao === item ? "btn-primary" : "btn-secondary"}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Período anterior"
                className="btn-secondary px-3"
                onClick={() => mover(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setReferencia(new Date())}
              >
                Hoje
              </button>
              <button
                type="button"
                aria-label="Próximo período"
                className="btn-secondary px-3"
                onClick={() => mover(1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold capitalize">
            {format(intervalo.start, "dd MMM", { locale: ptBR })} — {format(intervalo.end, "dd MMM yyyy", { locale: ptBR })}
          </p>
          <div className={`mt-4 grid gap-3 ${visao === "mes" ? "sm:grid-cols-2 xl:grid-cols-4" : "xl:grid-cols-2"}`}>
            {dias.map((dia) => {
              const doDia = itens.filter(
                (ordem) =>
                  new Date(ordem.data_hora_agendada!).toDateString() === dia.toDateString(),
              );
              return (
                <section
                  key={dia.toISOString()}
                  className="min-h-28 rounded-xl border border-base-border bg-white p-4"
                >
                  <h2 className="text-xs font-bold capitalize text-ink-muted">
                    {format(dia, "EEEE, dd/MM", { locale: ptBR })}
                  </h2>
                  <div className="mt-3 space-y-2">
                    {doDia.map((ordem) => (
                      <ItemAgenda key={ordem.id} os={ordem} tecnico={tecnico} />
                    ))}
                    {doDia.length === 0 && (
                      <p className="text-[11px] text-ink-faint">Sem serviços</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ResultadosBusca({
  ordens,
  tecnico,
}: {
  ordens: OrdemServico[];
  tecnico: boolean;
}) {
  const lista = [...ordens].sort(
    (a, b) => +new Date(b.data_hora_agendada!) - +new Date(a.data_hora_agendada!),
  );
  return (
    <section className="mt-4 rounded-xl border border-base-border bg-white p-4">
      <h2 className="font-bold">Resultados da busca ({lista.length})</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {lista.map((ordem) => (
          <ItemAgenda key={ordem.id} os={ordem} tecnico={tecnico} />
        ))}
        {lista.length === 0 && (
          <p className="text-xs text-ink-faint">Nenhuma OS encontrada.</p>
        )}
      </div>
    </section>
  );
}

function ItemAgenda({
  os,
  tecnico,
}: {
  os: OrdemServico;
  tecnico: boolean;
}) {
  return (
    <Link
      href={`/os/${os.id}`}
      className="block rounded-lg border border-base-border p-3 text-xs hover:border-amber"
    >
      <b className="break-words">
        {os.data_hora_agendada
          ? format(new Date(os.data_hora_agendada), "dd/MM/yyyy")
          : "Sem data"} · {os.cliente_nome}
      </b>
      <span className={`service-label service-${os.tipo} mt-2`}>
        {TIPO_LABEL[os.tipo]}
      </span>
      <span className="mt-2 block break-words leading-5 text-ink-muted">
        {os.veiculo_modelo} · {os.veiculo_identificador}
      </span>
      <span className="mt-1 block text-ink-muted">
        {STATUS_LABEL[os.status] ?? os.status}
      </span>
      {!tecnico && (
        <span className="mt-1 block font-medium">{os.tecnico?.nome ?? "Sem técnico"}</span>
      )}
    </Link>
  );
}
