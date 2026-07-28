import { differenceInCalendarDays } from "date-fns";

export type TipoServico = "instalacao" | "retirada" | "manutencao";
export type StatusOS = "pendente" | "agendado" | "concluido" | "cancelado";
export type OrdemServico = {
  id:string; tipo:TipoServico; status:StatusOS; cliente_nome:string; veiculo_modelo:string;
  veiculo_identificador:string; telefone:string|null; local:string; consultor_nome:string;
  observacoes?:string|null; data_hora_agendada:string|null; criado_em:string; concluido_em?:string|null;
  tecnico_id?:string|null; tecnico?:{nome:string}|null;
};
export const TIPO_LABEL:Record<TipoServico,string>={instalacao:"Instalação",retirada:"Retirada",manutencao:"Manutenção"};
export const TIPO_ICONE:Record<TipoServico,string>={instalacao:"🔧",retirada:"↩",manutencao:"🛠"};
export function diasPendente(os:OrdemServico){return Math.max(0,differenceInCalendarDays(new Date(),new Date(os.criado_em)));}
export function statusVisual(os:OrdemServico, amarelo=3, vermelho=7){
  if(os.status!=="pendente") return os.status;
  const dias=diasPendente(os); return dias>=vermelho?"critico":dias>=amarelo?"atrasado":"pendente";
}
export function telefoneWhatsapp(valor:string|null){
  let numero=(valor??"").replace(/\D/g,""); if(!numero.startsWith("55")) numero=`55${numero}`; return numero;
}
export function mensagemWhatsapp(os:OrdemServico,nomeTecnico:string){
  const texto=`Olá, ${os.cliente_nome}! Meu nome é ${nomeTecnico}, sou técnico da Foco e Escudo. Entro em contato para combinarmos o serviço de ${TIPO_LABEL[os.tipo].toLowerCase()} do veículo ${os.veiculo_modelo} (${os.veiculo_identificador}). Por gentileza, qual dia e horário são mais convenientes para você?`;
  return `https://wa.me/${telefoneWhatsapp(os.telefone)}?text=${encodeURIComponent(texto)}`;
}
export function cartaoOS(os:OrdemServico,nomeTecnico:string){return `━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ORDEM DE SERVIÇO\n━━━━━━━━━━━━━━━━━━━━━━━━\n${TIPO_ICONE[os.tipo]} ${TIPO_LABEL[os.tipo].toUpperCase()}\n👤 ${os.cliente_nome}\n🚗 ${os.veiculo_modelo} - ${os.veiculo_identificador}\n📱 ${os.telefone??"Não informado"}\n📍 ${os.local}\n👷 Técnico: ${nomeTecnico}\n🤝 Consultor: ${os.consultor_nome}\n━━━━━━━━━━━━━━━━━━━━━━━━`;}
