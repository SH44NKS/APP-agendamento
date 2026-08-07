import { LucideIcon } from "lucide-react";

export type TemaPainel =
  | "vermelho"
  | "laranja"
  | "amarelo"
  | "azul"
  | "verde"
  | "roxo"
  | "neutro";

const TEMAS: Record<
  TemaPainel,
  { borda: string; faixa: string; icone: string; texto: string; contador: string }
> = {
  vermelho: {
    borda: "border-red-200",
    faixa: "border-red-200 bg-gradient-to-r from-red-100 via-red-50 to-white",
    icone: "border-red-200 bg-white/80 text-red-700",
    texto: "text-red-800",
    contador: "bg-red-600 text-white",
  },
  laranja: {
    borda: "border-orange-200",
    faixa:
      "border-orange-200 bg-gradient-to-r from-orange-100 via-orange-50 to-white",
    icone: "border-orange-200 bg-white/80 text-orange-700",
    texto: "text-orange-800",
    contador: "bg-orange-600 text-white",
  },
  amarelo: {
    borda: "border-yellow-300",
    faixa:
      "border-yellow-300 bg-gradient-to-r from-yellow-100 via-yellow-50 to-white",
    icone: "border-yellow-300 bg-white/80 text-amber-dark",
    texto: "text-amber-dark",
    contador: "bg-amber text-gray-950",
  },
  azul: {
    borda: "border-blue-200",
    faixa: "border-blue-200 bg-gradient-to-r from-blue-100 via-blue-50 to-white",
    icone: "border-blue-200 bg-white/80 text-blue-700",
    texto: "text-blue-800",
    contador: "bg-blue-600 text-white",
  },
  verde: {
    borda: "border-emerald-200",
    faixa:
      "border-emerald-200 bg-gradient-to-r from-emerald-100 via-emerald-50 to-white",
    icone: "border-emerald-200 bg-white/80 text-emerald-700",
    texto: "text-emerald-800",
    contador: "bg-emerald-600 text-white",
  },
  roxo: {
    borda: "border-violet-200",
    faixa:
      "border-violet-200 bg-gradient-to-r from-violet-100 via-violet-50 to-white",
    icone: "border-violet-200 bg-white/80 text-violet-700",
    texto: "text-violet-800",
    contador: "bg-violet-600 text-white",
  },
  neutro: {
    borda: "border-slate-200",
    faixa:
      "border-slate-200 bg-gradient-to-r from-slate-100 via-slate-50 to-white",
    icone: "border-slate-200 bg-white/80 text-slate-600",
    texto: "text-slate-800",
    contador: "bg-slate-700 text-white",
  },
};

export function PainelDestaque({
  Icone,
  titulo,
  descricao,
  contador,
  tema = "neutro",
  children,
  className = "",
  conteudoClassName = "p-4 sm:p-5",
}: {
  Icone: LucideIcon;
  titulo: string;
  descricao?: string;
  contador?: number | string;
  tema?: TemaPainel;
  children?: React.ReactNode;
  className?: string;
  conteudoClassName?: string;
}) {
  const visual = TEMAS[tema];

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-[0_10px_30px_rgba(17,24,39,.06)] ${visual.borda} ${className}`}
    >
      <header
        className={`relative overflow-hidden border-b px-4 py-4 sm:px-5 ${visual.faixa}`}
      >
        <Icone
          size={88}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`pointer-events-none absolute -right-2 -top-3 opacity-[.10] ${visual.texto}`}
        />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${visual.icone}`}
            >
              <Icone size={20} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                className={`break-words text-sm font-black uppercase tracking-[.06em] ${visual.texto}`}
              >
                {titulo}
              </h2>
              {descricao && (
                <p className={`mt-1 text-xs leading-5 opacity-75 ${visual.texto}`}>
                  {descricao}
                </p>
              )}
            </div>
          </div>
          {contador !== undefined && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${visual.contador}`}
            >
              {contador}
            </span>
          )}
        </div>
      </header>
      {children && <div className={conteudoClassName}>{children}</div>}
    </section>
  );
}
