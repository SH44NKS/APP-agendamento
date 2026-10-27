"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ExternalLink, MessageSquarePlus, Reply } from "lucide-react";

export type ObservacaoConferencia = {
  id: string;
  os_id: string;
  texto: string;
  criado_em: string;
  autor?: { nome?: string | null } | null;
  os?: {
    cliente_nome?: string | null;
    veiculo_identificador?: string | null;
    veiculo_modelo?: string | null;
    local?: string | null;
    status?: string | null;
    telefone?: string | null;
    consultor_nome?: string | null;
    tipo?: string | null;
    prioridade?: string | null;
    tecnico?: { nome?: string | null } | null;
  } | null;
};

export function ConferenciaObservacoes({ observacoes }: { observacoes: ObservacaoConferencia[] }) {
  const router = useRouter();
  const [itens, setItens] = useState(observacoes);
  const [osAberta, setOsAberta] = useState<ObservacaoConferencia | null>(null);
  const [respondendo, setRespondendo] = useState<ObservacaoConferencia | null>(null);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function marcarComoLida(observacao: ObservacaoConferencia) {
    setBusy(true); setErro("");
    try {
      const response = await fetch(`/api/os/${observacao.os_id}/observacoes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ observacaoId: observacao.id }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível marcar como lida.");
      setItens((lista) => lista.filter((item) => item.id !== observacao.id));
      router.refresh();
    } catch (cause) { setErro(cause instanceof Error ? cause.message : "Não foi possível marcar como lida."); }
    finally { setBusy(false); }
  }

  async function responder() {
    if (!respondendo || !texto.trim()) return;
    setBusy(true); setErro("");
    try {
      const response = await fetch(`/api/os/${respondendo.os_id}/observacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, chamadoOrigemId: respondendo.id }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível enviar a resposta.");
      setItens((lista) => lista.filter((item) => item.id !== respondendo.id));
      setRespondendo(null); setTexto(""); router.refresh();
    } catch (cause) { setErro(cause instanceof Error ? cause.message : "Não foi possível enviar a resposta."); }
    finally { setBusy(false); }
  }

  if (itens.length === 0) return <div className="empty-state">Nenhuma observação aguardando conferência.</div>;

  return <div className="space-y-4">
    {itens.map((observacao) => <article key={observacao.id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-[0_8px_20px_rgba(17,24,39,.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-sm font-bold">{observacao.os?.cliente_nome || "Ordem de serviço"} · {observacao.os?.veiculo_identificador || "Sem placa/chassi"}</h2><p className="mt-1 break-words text-xs text-ink-muted">{observacao.os?.veiculo_modelo || "Veículo não informado"}{observacao.os?.local ? ` · ${observacao.os.local}` : ""}</p></div><span className="service-label service-manutencao">{observacao.os?.status || "Em aberto"}</span></div>
      <div className="mt-4 rounded-lg border border-amber/30 bg-amber/5 p-3"><p className="whitespace-pre-wrap break-words text-sm leading-6">{observacao.texto}</p><p className="mt-2 text-[10px] text-ink-faint">{observacao.autor?.nome || "Técnico"} · {formatarDataHora(observacao.criado_em)}</p></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setOsAberta(observacao)} className="btn-secondary"><ExternalLink size={16}/>Abrir OS</button><button type="button" onClick={() => { setRespondendo(observacao); setTexto(""); setErro(""); }} disabled={busy} className="btn-primary"><Reply size={16}/>Responder</button><button type="button" onClick={() => marcarComoLida(observacao)} disabled={busy} className="btn-secondary"><CheckCheck size={16}/>Marcar como lida</button></div>
    </article>)}
    {respondendo && <section className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={() => !busy && setRespondendo(null)}><div role="dialog" aria-modal="true" aria-labelledby="responder-conferencia" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><h2 id="responder-conferencia" className="text-lg font-bold">Responder observação</h2><p className="mt-1 text-xs text-ink-muted">Para {respondendo.autor?.nome || "o técnico"} · {respondendo.os?.cliente_nome || "OS"}</p><textarea autoFocus value={texto} onChange={(event) => setTexto(event.target.value)} maxLength={2000} className="campo mt-4 min-h-32" placeholder="Escreva a resposta para este chamado..."/><div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setRespondendo(null)} disabled={busy} className="btn-secondary">Cancelar</button><button type="button" onClick={responder} disabled={busy || !texto.trim()} className="btn-primary"><MessageSquarePlus size={16}/>{busy ? "Enviando..." : "Enviar resposta"}</button></div></div></section>}
    {osAberta && <section className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={() => setOsAberta(null)}><div role="dialog" aria-modal="true" aria-labelledby="detalhes-os-conferencia" className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">ORDEM DE SERVIÇO</p><h2 id="detalhes-os-conferencia" className="mt-1 text-lg font-bold">{osAberta.os?.cliente_nome || "Cliente não informado"}</h2><p className="mt-1 text-xs text-ink-muted">{osAberta.os?.veiculo_identificador || "Sem placa/chassi"} · {osAberta.os?.status || "Em aberto"}</p></div><button type="button" onClick={() => setOsAberta(null)} className="btn-secondary px-3">Fechar</button></div><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Linha label="Veículo" valor={osAberta.os?.veiculo_modelo}/><Linha label="Telefone" valor={osAberta.os?.telefone}/><Linha label="Local" valor={osAberta.os?.local}/><Linha label="Técnico" valor={osAberta.os?.tecnico?.nome}/><Linha label="Consultor" valor={osAberta.os?.consultor_nome}/><Linha label="Serviço" valor={osAberta.os?.tipo}/><Linha label="Prioridade" valor={osAberta.os?.prioridade}/></dl></div></section>}
    {erro && <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-700">{erro}</p>}
  </div>;
}

function Linha({ label, valor }: { label: string; valor?: string | null }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{label}</dt><dd className="mt-1 break-words text-sm text-ink">{valor || "Não informado"}</dd></div>;
}

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}
