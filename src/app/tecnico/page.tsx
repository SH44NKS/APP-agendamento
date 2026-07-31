import Link from "next/link";
import { CalendarDays, LogOut, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { OSCard } from "@/components/OSCard";
import { OrdemServico, STATUS_LABEL } from "@/lib/os";
type Filtros = { busca?: string; status?: string };
export default async function TecnicoPage({ searchParams }: { searchParams: Filtros }) {
  const s=createClient(); const{data:{user}}=await s.auth.getUser(); const[{data:ordens},{data:perfil}]=await Promise.all([s.from("ordens_servico").select("*").eq("tecnico_id",user?.id).order("criado_em",{ascending:false}),s.from("profiles").select("nome").eq("id",user?.id).single()]);
  const busca=(searchParams.busca??"").trim().toLocaleLowerCase("pt-BR");
  const lista=((ordens??[]) as OrdemServico[]).filter(os=>!searchParams.status||os.status===searchParams.status).filter(os=>!busca||[os.cliente_nome,os.veiculo_identificador,os.veiculo_modelo,os.local].some(valor=>valor?.toLocaleLowerCase("pt-BR").includes(busca))).sort((a,b)=>+new Date(b.criado_em)-+new Date(a.criado_em));
  return <main className="min-h-screen bg-base-bg px-4 py-6"><div className="mx-auto max-w-md"><header className="flex items-center justify-between rounded-xl border border-base-border bg-white p-3 shadow-sm"><Link href="/tecnico" className="flex items-center gap-3"><span className="brand-mark">FE</span><div><b className="text-sm font-extrabold text-gray-900">APP agendamento</b><p className="font-mono text-[9px] uppercase tracking-[.14em] text-ink-muted">Foco & Escudo</p></div></Link><LogoutButton icon={<LogOut size={16}/>} /></header>
    <div className="mt-9 flex items-end justify-between gap-3"><div><p className="eyebrow">MEUS SERVIÇOS</p><h1 className="mt-2 text-2xl font-extrabold">Olá, {perfil?.nome?.split(" ")[0]??"técnico"}</h1></div><Link href="/dashboard/agenda" className="btn-secondary shrink-0"><CalendarDays size={16}/>Agenda</Link></div><p className="mt-2 text-sm text-ink-muted">As OS mais novas aparecem primeiro.</p>
    <form className="mt-5 grid gap-2 rounded-xl border border-base-border bg-white p-3"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"/><input name="busca" defaultValue={searchParams.busca} className="campo pl-9" placeholder="Nome, placa, chassi ou modelo"/></div><div className="grid grid-cols-[1fr_auto] gap-2"><select name="status" defaultValue={searchParams.status??""} className="campo"><option value="">Todos os status</option>{Object.entries(STATUS_LABEL).filter(([id])=>!["atrasado","critico","concluido"].includes(id)).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><button type="submit" className="btn-secondary">Filtrar</button></div></form>
    <p className="mt-4 text-xs text-ink-muted">{lista.length} resultado(s)</p><div className="mt-3 flex flex-col gap-3">{lista.map(os=><OSCard key={os.id} os={os}/>)}{lista.length===0&&<div className="empty-state">Nenhuma ordem encontrada com esses filtros.</div>}</div>
  </div></main>;
}
