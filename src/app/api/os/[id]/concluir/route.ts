import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";
export async function POST(_request:Request,{params}:{params:{id:string}}){
  const s=createClient();const{data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado"},{status:401});
  const{error}=await s.from("ordens_servico").update({status:"concluido_tecnico",concluido_tecnico_em:new Date().toISOString()}).eq("id",params.id).eq("tecnico_id",user.id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
}
