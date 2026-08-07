import { PackageMinus, Settings, Wrench } from "lucide-react";
import { TIPO_LABEL, TipoServico } from "@/lib/os";

export const SERVICO_VISUAL = {
  instalacao: {
    Icone: Wrench,
    faixa:
      "border-emerald-200 bg-gradient-to-r from-emerald-100 via-emerald-50 to-white",
    icone: "border-emerald-200 bg-white/80 text-emerald-700",
    marca: "text-emerald-600",
    titulo: "text-emerald-800",
    card: "border-emerald-200 bg-emerald-50/25 hover:border-emerald-400",
  },
  manutencao: {
    Icone: Settings,
    faixa:
      "border-yellow-300 bg-gradient-to-r from-yellow-100 via-yellow-50 to-white",
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

export function ServicoDestaque({
  tipo,
  detalhe = false,
  className = "",
}: {
  tipo: TipoServico;
  detalhe?: boolean;
  className?: string;
}) {
  const visual = SERVICO_VISUAL[tipo];
  const Icone = visual.Icone;

  return (
    <div
      className={`relative overflow-hidden border-b px-5 py-4 ${
        detalhe ? "sm:px-6 sm:py-5" : ""
      } ${visual.faixa} ${className}`}
    >
      <Icone
        size={detalhe ? 112 : 82}
        strokeWidth={1.5}
        aria-hidden="true"
        className={`pointer-events-none absolute -right-2 -top-3 opacity-[.11] ${visual.marca}`}
      />
      <div className="relative z-10 flex items-center gap-3">
        <span
          className={`flex shrink-0 items-center justify-center rounded-xl border shadow-sm ${
            detalhe ? "h-12 w-12" : "h-10 w-10"
          } ${visual.icone}`}
        >
          <Icone
            size={detalhe ? 25 : 21}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <span
            className={`block text-[9px] font-bold uppercase tracking-[.18em] opacity-70 ${visual.titulo}`}
          >
            Serviço a realizar
          </span>
          <strong
            className={`mt-0.5 block font-black uppercase tracking-[.04em] ${
              detalhe ? "text-lg sm:text-xl" : "text-base"
            } ${visual.titulo}`}
          >
            {TIPO_LABEL[tipo]}
          </strong>
        </div>
      </div>
    </div>
  );
}
