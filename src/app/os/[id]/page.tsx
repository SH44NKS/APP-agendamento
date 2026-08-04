import Link from "next/link";
import {notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {StatusBadge} from "@/components/StatusBadge";
import {OSActions} from "@/components/OSActions";
import {ObservacoesOS} from "@/components/ObservacoesOS";
import {AdminOSEditor} from "@/components/AdminOSEditor";
import {isAdminUser} from "@/lib/auth";
import {linkGoogleAgenda,mensagemWhatsapp,mensagemWhatsappSetor,OrdemServico,TIPO_LABEL,TipoServico,STATUS_LABEL} from "@/lib/os";

export default async function OSDetalhePage({params}:{params:{id:string}}){
  const s=createClient();
  const[{data:os},{data:auth},{data:tecnicos},{data:historico},{data:observacoes}]=await Promise.all([
    s.from("ordens_servico").select("*, tecnico:tecnico_id(nome)").eq("id",params.id).single(),
    s.auth.getUser(),
    s.from("profiles").select("id,nome").eq("papel","tecnico").eq("ativo",true).order("nome"),
    s.from("historico_os").select("*, usuario:usuario_id(nome)").eq("os_id",params.id).order("criado_em",{ascending:false}),
    s.from("observacoes_os").select("*, autor:autor_id(nome)").eq("os_id",params.id).order("criado_em",{ascending:false}),
  ]);
  if(!os)return notFound();
  const{data:perfil}=await s.from("profiles").select("nome,papel").eq("id",auth.user?.id).maybeSingle();
  const isAdmin=isAdminUser(auth.user?.email,perfil?.papel);
  return <main className="min-h-screen bg-base-bg px-4 py-8"><div className="mx-auto max-w-4xl">
    <Link href={isAdmin?"/dashboard":"/tecnico"} className="text-xs text-ink-muted hover:text-amber">← Voltar</Link>
    <div className="mt-4 grid gap-5 md:grid-cols-[1fr_330px]"><section>
      <div className="rounded-xl border border-base-border bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,.06)] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className={`service-label service-${os.tipo}`}>{TIPO_LABEL[os.tipo as TipoServico]}</p><h1 className="mt-3 text-xl font-bold sm:text-2xl">Ordem de serviço</h1>{os.prioridade==="alta"&&<span className="mt-2 inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold uppercase text-red-700">Prioridade alta</span>}</div><StatusBadge status={os.status}/></div><div className="my-5 border-t border-dashed border-base-border"/><dl className="space-y-4"><Linha label="Cliente" valor={os.cliente_nome}/><Linha label="Veículo" valor={`${os.veiculo_modelo} · ${os.veiculo_identificador}`}/><Linha label="Telefone" valor={os.telefone||"Não informado"}/><Linha label="Local" valor={os.local}/><Linha label="Técnico" valor={os.tecnico?.nome||"Não atribuído"}/><Linha label="Consultor" valor={os.consultor_nome}/><Linha label="Status atual" valor={STATUS_LABEL[os.status]??os.status}/>{os.observacoes&&<Linha label="Observações da OS" valor={os.observacoes}/>}</dl></div>
      <ObservacoesOS osId={os.id} observacoes={observacoes??[]} isAdmin={isAdmin} userId={auth.user?.id??""}/>
      {historico&&historico.length>0&&<div className="mt-5 rounded-xl border border-base-border bg-white p-5"><h2 className="section-title">Histórico</h2><div className="mt-4 space-y-3">{historico.map(h=><div key={h.id} className="border-l border-base-border pl-3 text-xs"><b>{acao(h.acao,h.detalhes)}</b><p className="mt-1 text-ink-faint">{h.usuario?.nome??"Sistema"} · {new Date(h.criado_em).toLocaleString("pt-BR")}</p></div>)}</div></div>}
    </section><aside><OSActions osId={os.id} whatsappUrl={mensagemWhatsapp(os as OrdemServico,isAdmin?(os.tecnico?.nome??"Técnico"):(perfil?.nome??"Técnico"))} setorWhatsappUrl={mensagemWhatsappSetor(os as OrdemServico,os.tecnico?.nome??perfil?.nome??"Técnico")} calendarUrl={linkGoogleAgenda(os as OrdemServico)} dataAtual={os.data_hora_agendada} status={os.status} isAdmin={isAdmin}/>{isAdmin&&<div className="mt-3"><AdminOSEditor os={os as OrdemServico} tecnicos={tecnicos??[]}/></div>}</aside></div>
  </div></main>
}
function Linha({label,valor}:{label:string;valor:string}){return <div><dt className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{valor}</dd></div>}
function acao(a:string,d:Record<string,unknown>){if(a==="insert")return"Ordem criada";const status=String(d?.status_novo??"");if(status)return`Status alterado para ${STATUS_LABEL[status]??status}`;if(d?.tecnico_anterior!==d?.tecnico_novo)return"Técnico reatribuído";return"Ordem atualizada"}
