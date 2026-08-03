import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const supabase = createClient();
  if (code) await supabase.auth.exchangeCodeForSession(code);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = user
    ? await supabase.from("profiles").select("papel").eq("id", user.id).maybeSingle()
    : { data: null };
  const destino = isAdminUser(user?.email, perfil?.papel) ? "/dashboard" : "/tecnico";
  const response = NextResponse.redirect(`${origin}${destino}`);
  response.cookies.set("last_activity", String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
