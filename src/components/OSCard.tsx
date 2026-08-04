import Link from "next/link";
import { Clock3, MapPin, UserRound } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { OrdemServico, TIPO_LABEL, diasPendente, statusVisual } from "@/lib/os";

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

  return (
    <Link
      href={`/os/${os.id}`}
      className={`os-card group ${os.prioridade === "alta" ? "border-red-400 bg-red-50/80 shadow-[0_10px_30px_rgba(220,38,38,.10)] hover:border-red-500" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`service-label service-${os.tipo}`}>
            {TIPO_LABEL[os.tipo]}
          </span>
          {os.prioridade === "alta" && (
            <span className="rounded-md border border-red-600 bg-red-600 px-2 py-1 font-mono text-[9px] font-bold uppercase text-white">
              Prioridade alta
            </span>
          )}
        </div>
        <StatusBadge status={visual} />
      </div>

      <div className="my-4 border-t border-dashed border-base-border" />
      <h3 className="break-words font-bold leading-5 text-gray-900">{os.cliente_nome}</h3>
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
