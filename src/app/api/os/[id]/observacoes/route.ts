import {createClient,getAuthUser} from "@/lib/supabase/server";
import {NextResponse} from "next/server";
import {isAdminUser} from "@/lib/auth";

export async function POST(req:Request,{params}:{params:{id:string}}){
  const s=createClient();const{data:{user}}=await getAuthUser(s);if(!user)return NextResponse.json({error:"Não autenticado"},{status:401});
  const{texto,chamadoOrigemId}=await req.json();if(!texto?.trim())return NextResponse.json({error:"Escreva uma observação"},{status:400});
  const{data:p}=await s.from("profiles").select("papel").eq("id",user.id).maybeSingle();const isAdmin=isAdminUser(user.email,p?.papel);
  if(chamadoOrigemId){
    if(!isAdmin)return NextResponse.json({error:"Somente a administração pode responder a um chamado."},{status:403});
    const{data:origem}=await s.from("observacoes_os").select("id,os_id,autor_id").eq("id",chamadoOrigemId).maybeSingle();
    if(!origem||origem.os_id!==params.id)return NextResponse.json({error:"Este chamado não pode receber resposta."},{status:400});
    const{data:autor}=await s.from("profiles").select("papel").eq("id",origem.autor_id).maybeSingle();
    if(autor?.papel!=="tecnico")return NextResponse.json({error:"Este chamado não pode receber resposta."},{status:400});
  }
  const{error}=await s.from("observacoes_os").insert({os_id:params.id,autor_id:user.id,texto:texto.trim(),chamado_origem_id:chamadoOrigemId??null});if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});
}

export async function PATCH(req:Request,{params}:{params:{id:string}}){
  const s=createClient();const{data:{user}}=await getAuthUser(s);if(!user)return NextResponse.json({error:"Não autenticado"},{status:401});
  const{data:p}=await s.from("profiles").select("papel").eq("id",user.id).maybeSingle();if(!isAdminUser(user.email,p?.papel))return NextResponse.json({error:"Sem permissão"},{status:403});
  const body=await req.json().catch(()=>({}));const observacaoId=typeof body.observacaoId==="string"?body.observacaoId:"";
  let update=s.from("observacoes_os").update({visto_admin_em:new Date().toISOString(),visto_admin_por:user.id}).eq("os_id",params.id).is("visto_admin_em",null);
  if(observacaoId)update=update.eq("id",observacaoId);
  const{error}=await update;if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});
}
