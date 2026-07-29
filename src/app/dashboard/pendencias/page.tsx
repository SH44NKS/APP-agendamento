import Link from "next/link";
import { BellRing, CalendarClock, ClipboardCheck, MessageCircleOff, TimerReset } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth";
import { diasPendente, MOTIVO_LABEL, OrdemServico, TIPO_LABEL } from "@/lib/os";

type Alerta = { id: string; os_id: string; texto: string; autor?: { nome: string } | null; os?: { cliente_nome: string; veiculo_identificador: string } | null };

export default async function PendenciasPage() {
  const s = createClient();
  const [{ data: auth }, { data: ordens }, { data: observacoes }] = await Promise.all([
    s.auth.getUser(),
    s.from("ordens_servico").select("*,tecnico:tecnico_id(nome)").order("criado_em", { ascending: true }),
    s.from("observacoes_os").select("id,os_id,texto,autor:autor_id(nome),os:os_id(cliente_nome,veiculo_identificador)").is("visto_admin_em", null).order("criado_em", { ascending: false }),
  ]);
  const { data: perfil } = await s.from("profiles").select("papel").eq("id", auth.user?.id).maybeSingle();
  if (!isAdminUser(auth.user?.email, perfil?.papel)) return <div className="empty-state">Acesso exclusivo da administração.</div>;
  const lista = (ordens ?? []) as OrdemServico[];
  const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date(inicioHoje); fimHoje.setDate(fimHoje.getDate() + 1);
  const semContato = lista.filter((o) => o.status === "pendente");
  const aguardando = lista.filter((o) => o.status === "aguardando_retorno" && diasPendente(o) >= 3);
  const hoje = lista.filter((o) => o.status === "agendado" && o.data_hora_agendada && new Date(o.data_hora_agendada) >= inicioHoje && new Date(o.data_hora_agendada) < fimHoje);
  const concluir = lista.filter((o) => o.status === "concluido_tecnico");
  const motivos = Object.entries(MOTIVO_LABEL).map(([id, label]) => ({ id, label, total: lista.filter((o) => o.motivo_ocorrencia === id).length })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  return <div><p className="eyebrow">CENTRAL OPERACIONAL</p><h1 className="mt-2 text-3xl font-bold">Central de pendências</h1><p className="mt-2 text-sm text-ink-muted">Tudo que precisa de atenção reunido em uma única tela.</p><div className="mt-7 grid gap-5 xl:grid-cols-2">
    <Grupo titulo="OS sem contato" detalhe="Ainda não tiveram conversa iniciada" icon={<MessageCircleOff size={18}/>} ordens={semContato}/>
    <Grupo titulo="Aguardando há 3+ dias" detalhe="Cliente ainda não retornou" icon={<TimerReset size={18}/>} ordens={aguardando}/>
    <Grupo titulo="Agendadas para hoje" detalhe="Atendimentos previstos para o dia" icon={<CalendarClock size={18}/>} ordens={hoje}/>
    <Grupo titulo="Aguardando finalização" detalhe="Concluídas pelos técnicos" icon={<ClipboardCheck size={18}/>} ordens={concluir}/>
    <section className="rounded-xl border border-base-border bg-white p-5 xl:col-span-2"><div className="flex items-center gap-2"><BellRing size={18} className="text-amber-dark"/><h2 className="font-bold">Observações não visualizadas</h2><Contador valor={observacoes?.length ?? 0}/></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{(observacoes as Alerta[] | null)?.map((o) => <Link key={o.id} href={`/os/${o.os_id}`} className="rounded-lg border border-base-border p-3 text-xs hover:border-amber"><b>{o.os?.cliente_nome} · {o.os?.veiculo_identificador}</b><span className="mt-1 block truncate text-ink-muted">{o.autor?.nome}: {o.texto}</span></Link>)}{!observacoes?.length && <Vazio/>}</div></section>
    <section className="rounded-xl border border-base-border bg-white p-5 xl:col-span-2"><h2 className="font-bold">Motivos mais recorrentes</h2><p className="mt-1 text-xs text-ink-muted">Resumo dos reagendamentos, cancelamentos e impossibilidades registrados.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{motivos.map((item) => <div key={item.id} className="rounded-lg border border-base-border bg-base-surface2 p-4"><p className="text-xs text-ink-muted">{item.label}</p><p className="mt-2 text-2xl font-bold">{item.total}</p></div>)}{motivos.length === 0 && <Vazio/>}</div></section>
  </div></div>;
}
function Grupo({ titulo, detalhe, icon, ordens }: { titulo: string; detalhe: string; icon: React.ReactNode; ordens: OrdemServico[] }) { return <section className="rounded-xl border border-base-border bg-white p-5"><div className="flex items-start justify-between gap-3"><div className="flex gap-2 text-amber-dark">{icon}<div><h2 className="font-bold text-gray-900">{titulo}</h2><p className="mt-1 text-xs text-ink-muted">{detalhe}</p></div></div><Contador valor={ordens.length}/></div><div className="mt-4 space-y-2">{ordens.slice(0, 10).map((o) => <Link key={o.id} href={`/os/${o.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-base-border p-3 hover:border-amber"><div className="min-w-0"><b className="block truncate text-sm">{o.cliente_nome}</b><span className="block truncate text-xs text-ink-muted">{TIPO_LABEL[o.tipo]} · {o.veiculo_identificador} · {o.tecnico?.nome ?? "Sem técnico"}</span></div>{o.data_hora_agendada && <time className="shrink-0 text-xs font-bold">{new Date(o.data_hora_agendada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>}</Link>)}{ordens.length === 0 && <Vazio/>}</div></section>; }
function Contador({ valor }: { valor: number }) { return <span className="rounded-full bg-amber/15 px-2.5 py-1 text-xs font-bold text-amber-dark">{valor}</span>; }
function Vazio() { return <p className="py-4 text-center text-xs text-ink-faint">Nenhuma pendência nesta categoria.</p>; }
