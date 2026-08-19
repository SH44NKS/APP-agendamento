import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const CINCO_DIAS = 5 * 24 * 60 * 60 * 1000;
const TEMPO_LIMITE_AUTENTICACAO = 5_000;

function rotaPublica(path: string) {
  return (
    path === "/" ||
    path === "/login" ||
    path === "/privacidade" ||
    path === "/termos" ||
    path.startsWith("/auth")
  );
}

async function comTempoLimite<T>(operacao: Promise<T>, limite: number) {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const tempoEsgotado = new Promise<null>((resolve) => {
    temporizador = setTimeout(() => resolve(null), limite);
  });

  try {
    return await Promise.race([operacao, tempoEsgotado]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Login, callback e páginas institucionais nunca devem esperar o Supabase.
  if (rotaPublica(path)) {
    return NextResponse.next();
  }

  const possuiCookieDeSessao = request.cookies
    .getAll()
    .some(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token")
    );

  if (!possuiCookieDeSessao) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  let user = null;
  try {
    const resultado = await comTempoLimite(
      supabase.auth.getUser(),
      TEMPO_LIMITE_AUTENTICACAO
    );
    user = resultado?.data.user ?? null;
  } catch {
    user = null;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const agora = Date.now();
  const ultimaAtividade = Number(
    request.cookies.get("last_activity")?.value ?? 0
  );

  if (ultimaAtividade > 0 && agora - ultimaAtividade > CINCO_DIAS) {
    return NextResponse.redirect(
      new URL("/auth/logout?motivo=inatividade", request.url)
    );
  }

  response.cookies.set("last_activity", String(agora), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|app-icon.png|pdf.worker.min.mjs|sw.js|manifest.webmanifest).*)",
  ],
};
