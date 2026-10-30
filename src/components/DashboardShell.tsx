"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {LayoutDashboard,CalendarDays,UsersRound,Search,Sun,Moon,ClipboardPlus,ShieldCheck} from 'lucide-react';
import {LogoutButton} from './LogoutButton';
const groups=[
 {label:'Visão geral',href:'/dashboard',routes:[['/dashboard','Dashboard'],['/dashboard/tecnicos','Por técnico']]},
 {label:'Operação',href:'/dashboard/agenda',routes:[['/dashboard/agenda','Agenda'],['/dashboard/pendencias','Pendências'],['/dashboard/criticos','OS críticas']]},
 {label:'Conferência',href:'/dashboard/conferencia',admin:true,routes:[['/dashboard/conferencia','Observações'],['/dashboard/finalizacao','Finalização']]},
 {label:'Equipe',href:'/dashboard/equipe',admin:true,routes:[['/dashboard/equipe','Gestão de técnicos']]},
 {label:'Nova OS',href:'/os/novo',admin:true,routes:[['/os/novo','Criar ordem de serviço']]},
];
export function DashboardShell({children,nome,papel}:{children:React.ReactNode;nome:string;papel:'admin'|'tecnico'}){
 const pathname=usePathname(),[theme,setTheme]=useState('dark');
 useEffect(()=>{setTheme(localStorage.getItem('fe-console-theme')||'dark');},[]);
 const allowed=groups.filter(g=>papel==='admin'||!g.admin).map((g,i)=>papel==='tecnico'&&i===0?{...g,label:'Meus serviços',href:'/tecnico',routes:[['/tecnico','Minhas OS']]}:g),group=allowed.find(g=>g.routes.some(([href])=>pathname===href));
 return <div className="corbel-console console-shell" data-theme={theme}>
  <header className="corbel-header"><Link href="/dashboard" className="corbel-brand"><span className="corbel-mark">FE</span><span><b>Foco & Escudo<span className="brand-dot">.</span></b><small>AGENDAMENTO OPERACIONAL</small></span></Link>
  <nav className="corbel-primary" aria-label="Navegação principal">{allowed.map(g=><Link key={g.href} className={group===g?'active':''} aria-current={group===g?'page':undefined} href={g.href}>{g.label}</Link>)}</nav>
  <div className="corbel-account"><span className="corbel-presence"/><span className="corbel-avatar">{nome.slice(0,1)||'F'}</span><span><b>{nome}</b><small>{papel==='admin'?'Administração':'Técnico'}</small></span></div></header>
  <aside className="corbel-rail" aria-label="Ferramentas"><Link href="/dashboard#lista-ordens" aria-label="Buscar ordens" title="Buscar ordens"><Search size={19}/></Link><Link href="/dashboard" aria-label="Dashboard" title="Dashboard"><LayoutDashboard size={19}/></Link><Link href="/dashboard/agenda" aria-label="Agenda" title="Agenda"><CalendarDays size={19}/></Link>{papel==='admin'&&<Link href="/dashboard/equipe" aria-label="Equipe" title="Equipe"><UsersRound size={19}/></Link>}<span/><button aria-label={theme==='dark'?'Usar tema claro':'Usar tema escuro'} title="Alternar tema" onClick={()=>{const next=theme==='dark'?'light':'dark';setTheme(next);localStorage.setItem('fe-console-theme',next);}}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button><LogoutButton compact/></aside>
  <main className="corbel-main"><nav className="corbel-subnav" aria-label="Seções">{group?.routes.filter(([href])=>papel==='admin'||!['/dashboard/pendencias','/dashboard/criticos'].includes(href)).map(([href,label])=><Link key={href} className={pathname===href?'active':''} aria-current={pathname===href?'page':undefined} href={href}>{label}</Link>)}</nav><div className="console-page-content" key={pathname}>{children}</div></main>
 </div>;
}
