"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Tecnico = { id: string; nome: string };

type Props = {
  busca?: string;
  status: string;
  tipo: string;
  prioridade?: string;
  tecnico?: string;
  tecnicos: Tecnico[];
};

export function BuscaOrdens({
  busca = "",
  status,
  tipo,
  prioridade,
  tecnico,
  tecnicos,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [termo, setTermo] = useState(busca);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setTermo(busca), [busca]);

  function navegar(params: URLSearchParams) {
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}#lista-ordens`, {
        scroll: false,
      });
    });
  }

  useEffect(() => {
    if (termo === busca) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (termo.trim()) params.set("busca", termo);
      else params.delete("busca");
      navegar(params);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [termo, busca, searchParams]);

  function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const campo of ["busca", "status", "tipo", "prioridade", "tecnico"]) {
      const valor = String(dados.get(campo) ?? "").trim();
      if (valor && valor !== "todos") params.set(campo, valor);
    }
    navegar(params);
  }

  const filtrosAtivos = Boolean(
    (status && status !== "todos") ||
      (tipo && tipo !== "todos") ||
      prioridade ||
      tecnico,
  );

  return (
    <form className="filter-bar" onSubmit={aplicarFiltros}>
      <input
        name="busca"
        value={termo}
        onChange={(event) => setTermo(event.target.value)}
        placeholder="Buscar cliente, veículo, placa, chassi, local ou consultor..."
        className="campo sm:col-span-2 xl:col-span-5"
        autoComplete="off"
      />
      <button className="btn-secondary" type="submit">
        Buscar
      </button>
      <span className="sr-only" aria-live="polite">
        {isPending ? "Atualizando resultados" : ""}
      </span>
      <details className="sm:col-span-2 xl:col-span-6" open={filtrosAtivos}>
        <summary className="cursor-pointer text-xs font-bold text-ink-muted hover:text-ink">
          Filtros opcionais
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Filtro
            name="status"
            value={status}
            allValue="todos"
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
            value={tipo}
            allValue="todos"
            label="Todos os serviços"
            items={[
              ["instalacao", "Instalação"],
              ["retirada", "Retirada"],
              ["manutencao", "Manutenção"],
            ]}
          />
          <Filtro
            name="prioridade"
            value={prioridade}
            label="Toda prioridade"
            items={[
              ["alta", "Alta"],
              ["padrao", "Padrão"],
            ]}
          />
          <select name="tecnico" defaultValue={tecnico ?? ""} className="campo">
            <option value="">Todos os técnicos</option>
            {tecnicos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>
      </details>
    </form>
  );
}

function Filtro({
  name,
  value,
  label,
  items,
  allValue = "",
}: {
  name: string;
  value?: string;
  label: string;
  items: string[][];
  allValue?: string;
}) {
  return (
    <select name={name} defaultValue={value ?? ""} className="campo">
      <option value={allValue}>{label}</option>
      {items.map(([itemValue, itemLabel]) => (
        <option key={itemValue} value={itemValue}>
          {itemLabel}
        </option>
      ))}
    </select>
  );
}
