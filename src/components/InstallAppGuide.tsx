"use client";
import {useEffect,useState} from "react";
import {Download,Monitor,MoreVertical,PlusSquare,Share2,Smartphone,X} from "lucide-react";

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};

export function InstallAppGuide(){
  const[open,setOpen]=useState(false),[prompt,setPrompt]=useState<InstallPrompt|null>(null),[installed,setInstalled]=useState(false);
  useEffect(()=>{
    if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
    const standalone=window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
    setInstalled(standalone);
    const before=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};
    const done=()=>{setInstalled(true);setOpen(false);setPrompt(null)};
    window.addEventListener("beforeinstallprompt",before);
    window.addEventListener("appinstalled",done);
    return()=>{window.removeEventListener("beforeinstallprompt",before);window.removeEventListener("appinstalled",done)};
  },[]);
  async function instalar(){if(!prompt)return;await prompt.prompt();const escolha=await prompt.userChoice;if(escolha.outcome==="accepted")setInstalled(true);setPrompt(null)}
  if(installed)return null;
  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-amber bg-gray-900 px-4 py-3 text-xs font-bold text-white shadow-xl transition hover:-translate-y-0.5" aria-label="Ver como instalar o aplicativo"><Download size={16} className="text-amber"/>Instalar app</button>
    {open&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="install-title" onMouseDown={e=>e.target===e.currentTarget&&setOpen(false)}><section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-base-border bg-white p-5 shadow-2xl sm:p-7"><header className="flex items-start justify-between gap-4"><div><p className="eyebrow">ACESSO RÁPIDO</p><h2 id="install-title" className="mt-2 text-2xl font-extrabold">Instale como aplicativo</h2><p className="mt-2 text-sm leading-6 text-ink-muted">O APP agendamento ficará na tela inicial e abrirá em uma janela própria, como um aplicativo comum.</p></div><button onClick={()=>setOpen(false)} className="rounded-lg border border-base-border p-2 text-ink-muted hover:bg-base-surface2" aria-label="Fechar"><X size={18}/></button></header>
      {prompt&&<button onClick={instalar} className="btn-primary mt-5 w-full"><Download size={17}/>Instalar agora neste dispositivo</button>}
      <div className="mt-6 grid gap-3">
        <Passo icon={<Smartphone size={18}/>} titulo="Android — Chrome"><span>Abra o menu <MoreVertical size={14} className="inline"/> e toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</span></Passo>
        <Passo icon={<Share2 size={18}/>} titulo="iPhone ou iPad — Safari"><span>Toque em <b>Compartilhar</b> <Share2 size={14} className="inline"/> e depois em <b>Adicionar à Tela de Início</b> <PlusSquare size={14} className="inline"/>.</span></Passo>
        <Passo icon={<Monitor size={18}/>} titulo="Computador — Chrome ou Edge"><span>Clique no ícone de instalação ao lado da barra de endereço ou abra o menu e escolha <b>Instalar APP agendamento</b>.</span></Passo>
      </div>
      <p className="mt-5 rounded-lg bg-amber/10 p-3 text-xs leading-5 text-amber-dark">No iPhone, a instalação precisa ser feita pelo Safari. No Android e no computador, use preferencialmente Chrome ou Edge.</p>
    </section></div>}
  </>
}

function Passo({icon,titulo,children}:{icon:React.ReactNode;titulo:string;children:React.ReactNode}){return <article className="flex gap-3 rounded-xl border border-base-border bg-base-surface2 p-4"><span className="icon-box shrink-0">{icon}</span><div><h3 className="text-sm font-bold">{titulo}</h3><p className="mt-1 text-xs leading-5 text-ink-muted">{children}</p></div></article>}
