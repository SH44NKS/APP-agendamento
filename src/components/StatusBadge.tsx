const labels:Record<string,string>={pendente:"Pendente",agendado:"Agendado",concluido:"Concluído",cancelado:"Cancelado",atrasado:"Atenção",critico:"Crítico"};
export function StatusBadge({status}:{status:string}){return <span className={`status status-${status}`}><i/>{labels[status]??status}</span>}
