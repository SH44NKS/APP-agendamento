import Link from "next/link";
import {
  Clock3,
  MapPin,
  PackageMinus,
  Settings,
  UserRound,
  Wrench,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import {
  OrdemServico,
  TipoServico,
  TIPO_LABEL,
  diasPendente,
  statusVisual,
} from "@/lib/os";

const VISUAL_SERVICO = {
  instalacao: {
    Icone: Wrench,
    faixa: "border-emerald-200 bg-gradient-to-r from-emerald-100 via-emerald-50 to-white",
    icone: "border-emerald-200 bg-white/80 text-emerald-700",
    marca: "text-emerald-600",
    titulo: "text-emerald-800",
    card: "border-emerald-200 bg-emerald-50/25 hover:border-emerald-400",
  },
  manutencao: {
    Icone: Settings,
    faixa: "border-yellow-300 bg-gradient-to-r from-yellow-100 via-yellow-50 to-white",
    icone: "border-yellow-300 bg-white/80 text-amber-dark",
    marca: "text-yellow-600",
    titulo: "text-amber-dark",
    card: "border-yellow-300 bg-yellow-50/25 hover:border-yellow-500",
  },
  retirada: {
    Icone: PackageMinus,
    faixa: "border-red-200 bg-gradient-to-r from-red-100 via-red-50 to-white",
    icone: "border-red-200 bg-white/80 text-red-700",
    marca: "text-red-600",
    titulo: "text-red-800",
    card: "border-red-200 bg-red-50/20 hover:border-red-400",
  },
} satisfies Record<
  TipoServico,
  {
    Icone: typeof Wrench;
    faixa: string;
    icone: string;
    marca: string;
    titulo: string;
    card: string;
  }
>;

export function OSCard({
  os,
  amarelo = 3,
  vermelho = 7,
}: {
  os: OrdemServico;
  amarelo?: number;
  vermelho?: number;
}) {
  const dias = diasPendente(os);
  const visual = statusVisual(os, amarelo, vermelho);
  const servico = VISUAL_SERVICO[os.tipo];
  const IconeServico = servico.Icone;
  const classeCard =
    os.prioridade === "alta"
      ? "border-red-400 bg-red-50/80 shadow-[0_10px_30px_rgba(220,38,38,.10)] hover:border-red-500"
      : servico.card;

  return (
    <Link href={`/os/${os.id}`} className={`os-card group ${classeCard}`}>
      <div
        className={`relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-xl border-b px-5 py-4 ${servico.faixa}`}
      >
        <IconeServico
          size={82}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`pointer-events-none absolute -right-2 -top-3 opacity-[.11] ${servico.marca}`}
        />
        <div className="relative z-10 flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${servico.icone}`}
          >
            <IconeServico size={21} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className={`block text-[9px] font-bold uppercase tracking-[.18em] ${servico.titulo} opacity-70`}>
              Serviço a realizar
            </span>
            <strong
              className={`mt-0.5 block text-base font-black uppercase tracking-[.04em] ${servico.titulo}`}
            >
              {TIPO_LABEL[os.tipo]}
            </strong>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {os.prioridade === "alta" ? (
          <span className="rounded-md border border-red-600 bg-red-600 px-2 py-1 font-mono text-[9px] font-bold uppercase text-white">
            Prioridade alta
          </span>
        ) : (
          <span className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-ink-faint">
            Ordem de serviço
          </span>
        )}
        <StatusBadge status={visual} />
      </div>

      <div className="my-4 border-t border-dashed border-base-border" />
      <h3 className="break-words font-bold leading-5 text-gray-900">
        {os.cliente_nome}
      </h3>
      <p className="mt-1 break-words font-mono text-xs leading-5 text-ink-muted">
        {os.veiculo_modelo} · {os.veiculo_identificador}
      </p>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-muted">
        <MapPin size={14} className="mt-0.5 shrink-0 text-amber-dark" />
        <span className="min-w-0 break-words">{os.local}</span>
      </p>
      {os.tecnico?.nome && (
        <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-ink-muted">
          <UserRound size={14} className="mt-0.5 shrink-0 text-amber-dark" />
          <span className="min-w-0 break-words">{os.tecnico.nome}</span>
        </p>
      )}
      <div className="mt-4 flex flex-col items-start justify-between gap-2 border-t border-base-border pt-3 text-[11px] text-ink-faint sm:flex-row sm:items-end">
        <span className="min-w-0 break-words">Consultor: {os.consultor_nome}</span>
        {["aguardando_retorno", "pendente", "reagendar"].includes(os.status) && (
          <span
            className={`flex shrink-0 items-center gap-1 font-mono font-medium ${visual === "critico" ? "text-red-700" : visual === "atrasado" ? "text-amber-dark" : ""}`}
          >
            <Clock3 size={12} />
            {dias === 0 ? "Hoje" : `${dias}d em aberto`}
          </span>
        )}
      </div>
    </Link>
  );
}
