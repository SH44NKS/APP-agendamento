import {STATUS_LABEL} from "@/lib/os";
export function StatusBadge({status}:{status:string}){return <span className={`status status-${status}`}><i/>{STATUS_LABEL[status]??status}</span>}
