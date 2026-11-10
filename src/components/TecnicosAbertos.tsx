"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MapPin, Pencil, UserRound, X } from "lucide-react";
import { AdminOSEditor } from "@/components/AdminOSEditor";
import { StatusBadge } from "@/components/StatusBadge";
import type { OrdemServico } from "@/lib/os";

type Tecnico = { id: string; nome: string };

export function TecnicosAbertos({ tecnicos, ordens }: { tecnicos: Tecnico[]; ordens: OrdemServico[] }) {
  const [tecnicoId, setTecnicoId] = useState("");
  const [osAberta, setOsAberta] = useState<OrdemServico | null>(null);
  const tecnico = tecnicos.find((item) => item.id === tecnicoId);
  const lista = useMemo(() => ordens.filter((ordem) => ordem.tecnico_id === tecnicoId), [ordens, tecnicoId]);

  return <div>
    <p className="eyebrow">OPERAÇÃO POR TÉCNICO</p>
    <h1 className="mt-2 text-3xl font-bold">Técnicos</h1>
    <p className="mt-2 text-sm text-ink-muted">Consulte os serviços ainda abertos e faça ajustes sem sair desta tela.</p>
    <section className="mt-7 rounded-2xl border border-base-border bg-base-surface p-5 shadow-sm">
      <label className="block max-w-xl text-sm font-semibold text-ink" htmlFor="tecnico">Selecione o técnico</label>
      <div className="mt-2 flex items-center gap-3"><UserRound className="shrink-0 text-brand" size={20} />
        <select id="tecnico" className="campo max-w-xl" value={tecnicoId} onChange={(event) => setTecnicoId(event.target.value)}>
          <option value="">Escolha um técnico para ver os serviços</option>
          {tecnicos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
      </div>
    </section>
    {!tecnicoId ? <div className="empty-state mt-6">Selecione um técnico para listar as ordens de serviço em aberto.</div> :
      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm text-ink-muted">Serviços em aberto de</p><h2 className="text-xl font-bold">{tecnico?.nome}</h2></div><strong className="rounded-full bg-brand/10 px-3 py-1 text-sm text-brand">{lista.length} {lista.length === 1 ? "serviço aberto" : "serviços abertos"}</strong></div>
        {lista.length === 0 ? <div className="empty-state">Este técnico não possui serviços em aberto.</div> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{lista.map((ordem) =>
            <button className="group rounded-xl border border-base-border bg-base-surface p-4 text-left shadow-sm transition hover:border-brand hover:shadow-md" key={ordem.id} onClick={() => setOsAberta(ordem)} type="button">
              <div className="flex items-start justify-between gap-3"><p className="line-clamp-2 font-bold text-ink">{ordem.cliente_nome}</p><StatusBadge status={ordem.status} /></div>
              <p className="mt-2 text-sm font-medium text-ink-muted">{ordem.veiculo_modelo || "Veículo não informado"}{ordem.veiculo_identificador ? ` · ${ordem.veiculo_identificador}` : ""}</p>
              {ordem.local && <p className="mt-3 flex gap-1.5 text-xs text-ink-faint"><MapPin className="mt-0.5 shrink-0" size={14} /><span className="line-clamp-2">{ordem.local}</span></p>}
              <span className="mt-4 flex items-center gap-1.5 text-xs font-bold text-brand">Abrir serviço <ExternalLink size={14} /></span>
            </button>)}</div>}
      </section>}
    {osAberta && <div aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setOsAberta(null)} role="dialog">
      <div className="mx-auto my-6 max-w-4xl rounded-2xl border border-base-border bg-base-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-base-border p-5"><div><p className="eyebrow">ORDEM DE SERVIÇO</p><h2 className="mt-1 text-xl font-bold">{osAberta.cliente_nome}</h2><p className="mt-1 text-sm text-ink-muted">{osAberta.veiculo_modelo || "Veículo não informado"}{osAberta.veiculo_identificador ? ` · ${osAberta.veiculo_identificador}` : ""}</p></div><button aria-label="Fechar serviço" className="rounded-lg p-2 text-ink-muted transition hover:bg-base-surface2 hover:text-ink" onClick={() => setOsAberta(null)} type="button"><X size={21} /></button></div>
        <div className="space-y-5 p-5"><div className="grid gap-3 rounded-xl bg-base-surface2 p-4 text-sm md:grid-cols-3"><Info label="Status"><StatusBadge status={osAberta.status} /></Info><Info label="Tipo">{osAberta.tipo}</Info><Info label="Técnico">{osAberta.tecnico?.nome || "Não atribuído"}</Info><Info label="Local" className="md:col-span-3">{osAberta.local || "Não informado"}</Info></div><div className="flex items-center gap-2 border-t border-base-border pt-5"><Pencil size={17} className="text-brand" /><h3 className="font-bold">Editar ordem de serviço</h3></div><AdminOSEditor os={osAberta} tecnicos={tecnicos} /></div>
      </div>
    </div>}
  </div>;
}

function Info({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{label}</p><div className="mt-1 font-medium text-ink">{children}</div></div>;
}
