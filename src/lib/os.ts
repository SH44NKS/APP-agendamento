import {differenceInCalendarDays} from "date-fns";

export type TipoServico="instalacao"|"retirada"|"manutencao";
export type StatusOS="aguardando_retorno"|"agendado"|"reagendar"|"concluido_tecnico"|"finalizado"|"cancelado"|"pendente"|"concluido";
export type OrdemServico={
  id:string;tipo:TipoServico;prioridade:"padrao"|"alta";status:StatusOS;cliente_nome:string;
  veiculo_modelo:string;veiculo_identificador:string;telefone:string|null;local:string;
  consultor_nome:string;observacoes?:string|null;data_hora_agendada:string|null;criado_em:string;
  concluido_em?:string|null;concluido_tecnico_em?:string|null;finalizado_em?:string|null;
  tecnico_id?:string|null;tecnico?:{nome:string}|null;
};

export const TIPO_LABEL:Record<TipoServico,string>={instalacao:"Instalação",retirada:"Retirada",manutencao:"Manutenção"};
export const TIPO_ICONE:Record<TipoServico,string>={instalacao:"🔧",retirada:"↩",manutencao:"🛠"};
export const STATUS_LABEL:Record<string,string>={
  aguardando_retorno:"Aguardando retorno",pendente:"Aguardando retorno",agendado:"Agendado",
  reagendar:"Reagendar",concluido_tecnico:"Concluído pelo técnico",finalizado:"Finalizado",
  concluido:"Finalizado",cancelado:"Cancelado",atrasado:"Atenção",critico:"Crítico",
};

export function diasPendente(os:OrdemServico){return Math.max(0,differenceInCalendarDays(new Date(),new Date(os.criado_em)))}
export function statusVisual(os:OrdemServico,amarelo=3,vermelho=7){
  if(!["aguardando_retorno","pendente","reagendar"].includes(os.status))return os.status;
  const dias=diasPendente(os);return dias>=vermelho?"critico":dias>=amarelo?"atrasado":os.status;
}
export function telefoneWhatsapp(valor:string|null){let numero=(valor??"").replace(/\D/g,"");if(!numero.startsWith("55"))numero=`55${numero}`;return numero}
export function mensagemWhatsapp(os:OrdemServico,nomeTecnico:string){
  const primeiroNome=os.cliente_nome.trim().split(/\s+/)[0]||os.cliente_nome;
  const texto=`Olá, ${primeiroNome}! Tudo bem?\nMe chamo ${nomeTecnico}, sou técnico da Foco Proteção e da Escudo Clube.\nEstou entrando em contato para agendarmos ${TIPO_LABEL[os.tipo].toLowerCase()} do rastreador, conforme previsto em contrato, no veículo ${os.veiculo_modelo}, placa ${os.veiculo_identificador}.`;
  return `https://wa.me/${telefoneWhatsapp(os.telefone)}?text=${encodeURIComponent(texto)}`;
}
export function cartaoOS(os:OrdemServico,nomeTecnico:string){return `━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ORDEM DE SERVIÇO\n━━━━━━━━━━━━━━━━━━━━━━━━\n${TIPO_ICONE[os.tipo]} ${TIPO_LABEL[os.tipo].toUpperCase()}\n👤 ${os.cliente_nome}\n🚗 ${os.veiculo_modelo} - ${os.veiculo_identificador}\n📱 ${os.telefone??"Não informado"}\n📍 ${os.local}\n👷 Técnico: ${nomeTecnico}\n🤝 Consultor: ${os.consultor_nome}\n━━━━━━━━━━━━━━━━━━━━━━━━`}
export function linkGoogleAgenda(os:OrdemServico){if(!os.data_hora_agendada)return null;const inicio=new Date(os.data_hora_agendada),fim=new Date(inicio.getTime()+60*60*1000);const formato=(d:Date)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");const p=new URLSearchParams({action:"TEMPLATE",text:`${TIPO_LABEL[os.tipo]} — ${os.cliente_nome}`,dates:`${formato(inicio)}/${formato(fim)}`,details:`Veículo: ${os.veiculo_modelo} (${os.veiculo_identificador})\nConsultor: ${os.consultor_nome}`,location:os.local});return `https://calendar.google.com/calendar/render?${p.toString()}`}
