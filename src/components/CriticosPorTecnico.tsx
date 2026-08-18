"use client";

import Link from "next/link";
import { Check, ClipboardCopy, MessageCircle, UserRound } from "lucide-react";
import { useState } from "react";
import { PainelDestaque } from "./PainelDestaque";
import { SERVICO_VISUAL } from "./ServicoDestaque";
import { STATUS_LABEL, TIPO_LABEL, TipoServico } from "@/lib/os";

type OrdemCritica = {
  id: string;
  clienteNome: string;
  veiculoModelo: string;
  veiculoIdentificador: string;
  tipo: TipoServico;
  status: string;
  diasSemMovimento: number;
  diasEmAberto: number;
};

type GrupoCritico = {
  tecnicoId: string;
  tecnicoNome: string;
  ordens: OrdemCritica[];
};

export function CriticosPorTecnico({
  grupos,
  limite,
}: {
  grupos: GrupoCritico[];
  limite: number;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);

  async function copiar(grupo: GrupoCritico) {
    await navigator.clipboard.writeText(mensagemCobranca(grupo, limite));
    setCopiado(grupo.tecnicoId);
    window.setTimeout(() => setCopiado(null), 2200);
  }

  function enviar(grupo: GrupoCritico) {
    const texto = encodeURIComponent(mensagemCobranca(grupo, limite));
    window.open(`https://wa.me/?text=${texto}`, "_blank", "noopener,noreferrer");
  }

  if (grupos.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <Check className="mx-auto text-emerald-700" size={28} />
        <h2 className="mt-3 font-bold text-emerald-900">
          Nenhuma OS crítica no momento
        </h2>
        <p className="mt-1 text-xs text-emerald-800/75">
          Todos os serviços tiveram movimentação dentro do prazo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grupos.map((grupo) => (
        <PainelDestaque
          key={grupo.tecnicoId}
          Icone={UserRound}
          titulo={grupo.tecnicoNome}
          descricao="Responsável pelas ordens abaixo"
          contador={grupo.ordens.length}
          tema="laranja"
          conteudoClassName="p-3 sm:p-4"
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => enviar(grupo)}
              className="btn-primary bg-green-600 text-white hover:bg-green-500"
              disabled={grupo.tecnicoId === "sem-tecnico"}
            >
              <MessageCircle size={16} />
              Cobrar pelo WhatsApp
            </button>
            <button
              type="button"
              onClick={() => copiar(grupo)}
              className="btn-secondary"
            >
              {copiado === grupo.tecnicoId ? (
                <Check size={16} className="text-emerald-700" />
              ) : (
                <ClipboardCopy size={16} />
              )}
              {copiado === grupo.tecnicoId ? "Lista copiada" : "Copiar lista"}
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {grupo.ordens.map((ordem) => {
              const visual = SERVICO_VISUAL[ordem.tipo];
              const Icone = visual.Icone;
              return (
                <Link
                  key={ordem.id}
                  href={`/os/${ordem.id}`}
                  className={`relative overflow-hidden rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${visual.card}`}
                >
                  <Icone
                    size={66}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className={`pointer-events-none absolute -right-1 -top-2 opacity-[.08] ${visual.marca}`}
                  />
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className={`service-label service-${ordem.tipo}`}>
                        {TIPO_LABEL[ordem.tipo]}
                      </span>
                      <span className="rounded-full bg-red-600 px-2.5 py-1 font-mono text-[9px] font-bold text-white">
                        {ordem.diasSemMovimento}d sem movimento
                      </span>
                    </div>
                    <h3 className="mt-3 break-words font-bold">
                      {ordem.clienteNome}
                    </h3>
                    <p className="mt-1 break-words font-mono text-xs leading-5 text-ink-muted">
                      {ordem.veiculoModelo} · {ordem.veiculoIdentificador}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink-muted">
                      <span>{STATUS_LABEL[ordem.status] ?? ordem.status}</span>
                      <span>{ordem.diasEmAberto}d em aberto</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </PainelDestaque>
      ))}
    </div>
  );
}

function mensagemCobranca(grupo: GrupoCritico, limite: number) {
  const primeiroNome = grupo.tecnicoNome.split(/\s+/)[0] || grupo.tecnicoNome;
  const exibidas = grupo.ordens.slice(0, 20);
  const linhas = exibidas.map(
    (ordem) =>
      `• ${ordem.clienteNome} — ${ordem.veiculoIdentificador} — ${ordem.diasSemMovimento} dias sem movimento`,
  );
  if (grupo.ordens.length > exibidas.length) {
    linhas.push(`• E mais ${grupo.ordens.length - exibidas.length} OS no sistema`);
  }

  return `Olá, ${primeiroNome}! Existem ${grupo.ordens.length} ordens de serviço críticas atribuídas a você, sem movimentação há ${limite} dias ou mais.\n\nPor favor, entre novamente em contato com os associados e registre o novo contato em cada OS:\n\n${linhas.join("\n")}\n\nAcesse o APP agendamento para atualizar os serviços.`;
}
