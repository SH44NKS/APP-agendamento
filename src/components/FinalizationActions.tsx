"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {CheckCircle2,RotateCcw} from "lucide-react";
export function FinalizationActions({osId}:{osId:string}){const r=useRouter(),[busy,setBusy]=useState(false);async function mudar(status:string){setBusy(true);const res=await fetch(`/api/os/${osId}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});setBusy(false);if(res.ok)r.refresh()}return <div className="mt-3 grid gap-2 sm:grid-cols-2"><button disabled={busy} onClick={()=>mudar("finalizado")} className="btn-primary"><CheckCircle2 size={15}/>Finalizar</button><button disabled={busy} onClick={()=>mudar("reagendar")} className="btn-secondary"><RotateCcw size={15}/>Reagendar</button></div>}
