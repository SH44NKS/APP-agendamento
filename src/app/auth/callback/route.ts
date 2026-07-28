import {createClient} from "@/lib/supabase/server";import {NextResponse} from "next/server";
export async function GET(request:Request){const{searchParams,origin}=new URL(request.url),code=searchParams.get("code");if(code)await createClient().auth.exchangeCodeForSession(code);return NextResponse.redirect(`${origin}/dashboard`)}
