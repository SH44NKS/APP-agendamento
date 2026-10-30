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

  return <div className={`corbel-service-heading ${detalhe?'is-detail':''} ${className}`} data-service={tipo}><span className="corbel-service-icon"><Icone size={20} strokeWidth={1.6}/></span><div><small>Tipo de atendimento</small><strong>{TIPO_LABEL[tipo]}</strong></div><Icone className="corbel-service-watermark" size={54} strokeWidth={1}/></div>;
}
