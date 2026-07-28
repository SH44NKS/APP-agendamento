import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Guarda o refresh token do Google (vem na sessão do provider) para
    // podermos criar eventos na agenda do técnico depois, sem pedir login de novo.
    const providerRefreshToken = (data.session as any)?.provider_refresh_token;
    if (providerRefreshToken && data.user) {
      await supabase.rpc("salvar_google_refresh_token", { token: providerRefreshToken });
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
