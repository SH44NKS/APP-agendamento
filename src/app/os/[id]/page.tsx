import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { OSActions } from "@/components/OSActions";
import { mensagemWhatsapp, OrdemServico, TIPO_LABEL, TipoServico } from "@/lib/os";

export default async function OSDetalhePage({ params }: { params: { id: string } }) {
  const s = createClient();
  const [{ data: os }, { data: auth }, { data: tecnicos }, { data: historico }] = await Promise.all([
    s.from("ordens_servico").select("*, tecnico:tecnico_id(nome)").eq("id", params.id).single(),
    s.auth.getUser(),
    s.from("profiles").select("id,nome").eq("papel", "tecnico").eq("ativo", true).order("nome"),
    s.from("historico_os").select("*, usuario:usuario_id(nome)").eq("os_id", params.id).order("criado_em", { ascending: false }),
  ]);
  if (!os) return notFound();
  const { data: perfil } = await s.from("profiles").select("nome,papel").eq("id", auth.user?.id).single();
  const isAdmin = perfil?.papel === "admin";

  return <main className="min-h-screen bg-base-bg px-4 py-8"><div className="mx-auto max-w-3xl">
    <Link href={isAdmin ? "/dashboard" : "/tecnico"} className="text-xs text-ink-muted hover:text-amber">← Voltar</Link>
    <div className="mt-4 grid gap-5 md:grid-cols-[1fr_310px]"><section>
      <div className="rounded-xl border border-base-border bg-base-surface p-6">
        <div className="flex items-start justify-between"><div><p className="service-label">ORDEM DE SERVIÇO</p><h1 className="mt-2 text-2xl font-bold">{TIPO_LABEL[os.tipo as TipoServico]}</h1></div><StatusBadge status={os.status}/></div>
        <div className="my-5 border-t border-dashed border-base-border"/>
        <dl className="space-y-4"><Linha label="Cliente" valor={os.cliente_nome}/><Linha label="Veículo" valor={`${os.veiculo_modelo} · ${os.veiculo_identificador}`}/><Linha label="Telefone" valor={os.telefone || "Não informado"}/><Linha label="Local" valor={os.local}/><Linha label="Técnico" valor={os.tecnico?.nome || "Não atribuído"}/><Linha label="Consultor" valor={os.consultor_nome}/>{os.observacoes && <Linha label="Observações" valor={os.observacoes}/>}</dl>
      </div>
      {historico && historico.length > 0 && <div className="mt-5 rounded-xl border border-base-border bg-base-surface p-5"><h2 className="section-title">Histórico</h2><div className="mt-4 space-y-3">{historico.map(h => <div key={h.id} className="border-l border-base-border pl-3 text-xs"><b>{acao(h.acao, h.detalhes)}</b><p className="mt-1 text-ink-faint">{h.usuario?.nome ?? "Sistema"} · {new Date(h.criado_em).toLocaleString("pt-BR")}</p></div>)}</div></div>}
    </section><aside><OSActions osId={os.id} whatsappUrl={mensagemWhatsapp(os as OrdemServico, perfil?.nome ?? "")} dataAtual={os.data_hora_agendada} status={os.status} isAdmin={isAdmin} tecnicoId={os.tecnico_id} tecnicos={tecnicos ?? []}/></aside></div>
  </div></main>;
}
function Linha({ label, valor }: { label: string; valor: string }) { return <div><dt className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</dt><dd className="mt-1 text-sm">{valor}</dd></div>; }
function acao(a: string, d: Record<string, unknown>) { if (a === "insert") return "Ordem criada"; if (d?.status_novo === "agendado") return "Agendamento confirmado"; if (d?.status_novo === "concluido") return "Serviço concluído"; if (d?.status_novo === "cancelado") return "Ordem cancelada"; if (d?.tecnico_anterior !== d?.tecnico_novo) return "Técnico reatribuído"; return "Ordem atualizada"; }
