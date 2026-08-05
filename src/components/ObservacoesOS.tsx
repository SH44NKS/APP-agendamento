"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {CheckCheck,MessageSquarePlus} from "lucide-react";
import {formatarDataHora} from "@/lib/datetime";

type Obs={id:string;texto:string;criado_em:string;visto_admin_em:string|null;autor?:{nome:string}|null;autor_id:string};
export function ObservacoesOS({osId,observacoes,isAdmin,userId}:{osId:string;observacoes:Obs[];isAdmin:boolean;userId:string}){
  const r=useRouter(),[texto,setTexto]=useState(""),[busy,setBusy]=useState(false),[erro,setErro]=useState("");
  async function enviar(){setBusy(true);setErro("");const res=await fetch(`/api/os/${osId}/observacoes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({texto})});const json=await res.json().catch(()=>({}));setBusy(false);if(!res.ok){setErro(json.error??"Não foi possível enviar.");return}setTexto("");r.refresh()}
  async function marcarVisto(){setBusy(true);const res=await fetch(`/api/os/${osId}/observacoes`,{method:"PATCH"});setBusy(false);if(res.ok)r.refresh()}
  const pendentes=observacoes.filter(o=>!o.visto_admin_em&&o.autor_id!==userId).length;
  return <section className="mt-5 rounded-xl border border-base-border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="section-title">Observações e chamados</h2><p className="mt-1 text-xs text-ink-muted">Registre informações importantes sobre este serviço.</p></div>{isAdmin&&pendentes>0&&<button onClick={marcarVisto} disabled={busy} className="btn-secondary"><CheckCheck size={15}/>Marcar como visto</button>}</div>
    <div className="mt-4 space-y-3">{observacoes.map(o=><article key={o.id} className={`rounded-lg border p-3 text-sm ${!o.visto_admin_em&&!isAdmin?"border-amber bg-amber/5":"border-base-border bg-base-surface2"}`}><p className="leading-6">{o.texto}</p><p className="mt-2 text-[10px] text-ink-faint">{o.autor?.nome??"Usuário"} · {formatarDataHora(o.criado_em)}{o.visto_admin_em&&" · visto pela administração"}</p></article>)}{observacoes.length===0&&<p className="text-xs text-ink-faint">Nenhuma observação registrada.</p>}</div>
    <textarea value={texto} onChange={e=>setTexto(e.target.value)} className="campo mt-4 min-h-24" maxLength={2000} placeholder={isAdmin?"Adicionar uma observação administrativa...":"Informe uma ocorrência, dificuldade ou observação para a administração..."}/><button onClick={enviar} disabled={busy||!texto.trim()} className="btn-primary mt-2 w-full"><MessageSquarePlus size={16}/>Enviar observação</button>{erro&&<p className="mt-2 text-xs text-red-700">{erro}</p>}
  </section>
}
