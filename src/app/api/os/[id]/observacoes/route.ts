import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";
import {isAdminUser} from "@/lib/auth";

export async function POST(req:Request,{params}:{params:{id:string}}){
  const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Não autenticado"},{status:401});
  const{texto}=await req.json();if(!texto?.trim())return NextResponse.json({error:"Escreva uma observação"},{status:400});
  const{error}=await s.from("observacoes_os").insert({os_id:params.id,autor_id:user.id,texto:texto.trim()});if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});
}

export async function PATCH(_req:Request,{params}:{params:{id:string}}){
  const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Não autenticado"},{status:401});
  const{data:p}=await s.from("profiles").select("papel").eq("id",user.id).maybeSingle();if(!isAdminUser(user.email,p?.papel))return NextResponse.json({error:"Sem permissão"},{status:403});
  const{error}=await s.from("observacoes_os").update({visto_admin_em:new Date().toISOString(),visto_admin_por:user.id}).eq("os_id",params.id).is("visto_admin_em",null);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});
}
