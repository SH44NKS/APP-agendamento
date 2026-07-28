"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {RefreshCw} from "lucide-react";

export function RefreshDashboardButton(){
  const router=useRouter();
  const[isPending,startTransition]=useTransition();
  const[atualizado,setAtualizado]=useState(false);
  function atualizar(){setAtualizado(false);startTransition(()=>{router.refresh();setAtualizado(true);setTimeout(()=>setAtualizado(false),2500)})}
  return <div className="flex items-center gap-2"><button type="button" onClick={atualizar} disabled={isPending} className="btn-secondary"><RefreshCw size={16} className={isPending?"animate-spin":""}/>{isPending?"Atualizando...":"Atualizar dashboard"}</button>{atualizado&&<span className="hidden text-[10px] text-green-700 sm:inline">Atualizado</span>}</div>
}
