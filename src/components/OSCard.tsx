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
  const dias = diasPendente(os),
    visual = statusVisual(os, amarelo, vermelho);
  return (
    <Link
      href={`/os/${os.id}`}
      className={`os-card group ${os.prioridade === "alta" ? "border-red-300" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="service-label">{TIPO_LABEL[os.tipo]}</span>
          {os.prioridade === "alta" && (
            <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-mono text-[9px] font-bold uppercase text-red-700">
              Prioridade alta
            </span>
          )}
        </div>
        <StatusBadge status={visual} />
      </div>
      <div className="my-4 border-t border-dashed border-base-border" />
      <h3 className="truncate font-bold text-gray-900">{os.cliente_nome}</h3>
      <p className="mt-1 truncate font-mono text-xs text-ink-muted">
        {os.veiculo_modelo} · {os.veiculo_identificador}
      </p>
      <p className="mt-4 flex items-center gap-2 truncate text-xs text-ink-muted">
        <MapPin size={14} className="shrink-0 text-amber-dark" />
        {os.local}
      </p>
      {os.tecnico?.nome && (
        <p className="mt-2 flex items-center gap-2 truncate text-xs text-ink-muted">
          <UserRound size={14} className="shrink-0 text-amber-dark" />
          {os.tecnico.nome}
        </p>
      )}
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-base-border pt-3 text-[11px] text-ink-faint">
        <span>Consultor: {os.consultor_nome}</span>
          {["aguardando_retorno","pendente","reagendar"].includes(os.status) && (
          <span
            className={`flex items-center gap-1 font-mono font-medium ${visual === "critico" ? "text-red-700" : visual === "atrasado" ? "text-amber-dark" : ""}`}
          >
            <Clock3 size={12} />
            {dias === 0 ? "Hoje" : `${dias}d em aberto`}
          </span>
        )}
      </div>
    </Link>
  );
}
