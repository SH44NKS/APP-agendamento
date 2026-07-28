import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";
import {isAdminUser} from "@/lib/auth";

async function adminClient(){const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user)return{s,user:null,admin:false};const{data:p}=await s.from("profiles").select("papel").eq("id",user.id).maybeSingle();return{s,user,admin:isAdminUser(user.email,p?.papel)}}

export async function POST(req:Request,{params}:{params:{id:string}}){
  const{s,user,admin}=await adminClient();if(!user)return NextResponse.json({error:"Não autenticado"},{status:401});if(!admin)return NextResponse.json({error:"Sem permissão"},{status:403});
  const body=await req.json();const permitidos=["tipo","prioridade","status","cliente_nome","veiculo_modelo","veiculo_identificador","telefone","local","tecnico_id","consultor_nome","observacoes","data_hora_agendada"];
  const update:Record<string,unknown>={};for(const campo of permitidos)if(campo in body)update[campo]=body[campo]||null;
  if(body.status==="finalizado"){update.finalizado_em=new Date().toISOString();update.concluido_em=new Date().toISOString()}
  if(body.status==="reagendar"){update.data_hora_agendada=null;update.concluido_tecnico_em=null}
  const{error}=await s.from("ordens_servico").update(update).eq("id",params.id);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});
}

export async function DELETE(_req:Request,{params}:{params:{id:string}}){
  const{s,user,admin}=await adminClient();if(!user)return NextResponse.json({error:"Não autenticado"},{status:401});if(!admin)return NextResponse.json({error:"Sem permissão"},{status:403});
  const{error}=await s.from("ordens_servico").delete().eq("id",params.id);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});
}
