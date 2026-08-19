"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TEMPO_LIMITE_LOGIN = 10_000;
const TEMPO_LIMITE_LIMPEZA = 3_000;

type EtapaLogin = "parado" | "conectando" | "recuperando";

class TempoDeLoginEsgotado extends Error {
  constructor() {
    super("O serviço de login demorou mais que o esperado.");
    this.name = "TempoDeLoginEsgotado";
  }
}

function comTempoLimite<T>(operacao: PromiseLike<T>, limite: number) {
  return new Promise<T>((resolve, reject) => {
    const temporizador = window.setTimeout(
      () => reject(new TempoDeLoginEsgotado()),
      limite
    );

    Promise.resolve(operacao).then(
      (resultado) => {
        window.clearTimeout(temporizador);
        resolve(resultado);
      },
      (erro) => {
        window.clearTimeout(temporizador);
        reject(erro);
      }
    );
  });
}

function removerDadosLocaisDaSessao() {
  try {
    for (let indice = window.localStorage.length - 1; indice >= 0; indice -= 1) {
      const chave = window.localStorage.key(indice);
      if (chave?.startsWith("sb-") && chave.includes("-auth-token")) {
        window.localStorage.removeItem(chave);
      }
    }
  } catch {
    // Alguns modos privados bloqueiam o acesso ao armazenamento local.
  }

  try {
    for (const cookie of document.cookie.split(";")) {
      const nome = cookie.split("=")[0]?.trim();
      if (nome?.startsWith("sb-") && nome.includes("-auth-token")) {
        document.cookie = `${nome}=; Max-Age=0; path=/; SameSite=Lax`;
      }
    }
  } catch {
    // A tentativa via cliente Supabase continua válida se cookies forem restritos.
  }
}

function mensagemDoErro(erro: unknown) {
  if (erro instanceof TempoDeLoginEsgotado) {
    return "O login está demorando mais que o normal. A recuperação automática foi tentada; verifique sua conexão e tente novamente.";
  }

  const mensagem = erro instanceof Error ? erro.message : String(erro);
  if (/failed to fetch|network|fetch failed/i.test(mensagem)) {
    return "Não foi possível alcançar o serviço de login. Verifique sua conexão e tente novamente.";
  }

  return "Não foi possível concluir o login agora. A sessão anterior foi limpa; tente novamente em alguns instantes.";
}

async function iniciarOAuth(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await comTempoLimite(
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    }),
    TEMPO_LIMITE_LOGIN
  );

  if (error) throw error;
  if (!data.url) throw new Error("O endereço de autenticação não foi recebido.");

  window.location.assign(data.url);
}

async function limparSessaoInvalida(
  supabase: ReturnType<typeof createClient>
) {
  try {
    await comTempoLimite(
      supabase.auth.signOut({ scope: "local" }),
      TEMPO_LIMITE_LIMPEZA
    );
  } catch {
    // A limpeza do navegador abaixo também funciona se a API estiver indisponível.
  } finally {
    removerDadosLocaisDaSessao();
  }
}

export default function LoginPage() {
  const [etapa, setEtapa] = useState<EtapaLogin>("parado");
  const [erro, setErro] = useState("");
  const ocupado = etapa !== "parado";

  useEffect(() => {
    const motivo = new URLSearchParams(window.location.search).get("erro");
    if (motivo !== "sessao") return;

    window.history.replaceState(null, "", window.location.pathname);
    const supabase = createClient();
    setEtapa("recuperando");

    void (async () => {
      await limparSessaoInvalida(supabase);
      try {
        await iniciarOAuth(supabase);
      } catch (erroFinal) {
        setErro(mensagemDoErro(erroFinal));
        setEtapa("parado");
      }
    })();
  }, []);

  async function entrar() {
    if (ocupado) return;

    const supabase = createClient();
    setErro("");
    setEtapa("conectando");

    try {
      await iniciarOAuth(supabase);
    } catch {
      setEtapa("recuperando");
      await limparSessaoInvalida(supabase);

      try {
        await iniciarOAuth(supabase);
      } catch (erroFinal) {
        setErro(mensagemDoErro(erroFinal));
        setEtapa("parado");
      }
    }
  }

  const textoBotao =
    etapa === "recuperando"
      ? "Renovando acesso..."
      : etapa === "conectando"
        ? "Conectando..."
        : "Entrar com Google";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base-bg px-4">
      <div className="absolute inset-x-0 top-0 h-1 bg-amber" />
      <div className="w-full max-w-sm rounded-xl border border-base-border bg-white p-8 shadow-[0_18px_50px_rgba(17,24,39,.08)]">
        <Image
          src="/app-icon.png"
          alt="Ícone do APP agendamento"
          width={80}
          height={80}
          priority
          className="rounded-2xl border border-amber shadow-sm"
        />
        <p className="eyebrow mt-8">FOCO & ESCUDO</p>
        <h1 className="mt-2 text-2xl font-extrabold">Agenda de serviços</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Instalações, retiradas e manutenções organizadas em um só lugar.
        </p>
        <button
          type="button"
          onClick={entrar}
          disabled={ocupado}
          className="btn-secondary mt-8 w-full"
        >
          <GoogleIcon />
          {textoBotao}
        </button>
        {erro && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
          >
            <p>{erro}</p>
            <button
              type="button"
              onClick={entrar}
              className="mt-2 font-semibold underline underline-offset-2 hover:text-red-900"
            >
              Tentar novamente
            </button>
          </div>
        )}
        <p className="mt-6 flex gap-2 text-[10px] leading-4 text-ink-faint">
          <ShieldCheck size={14} className="shrink-0 text-amber-dark" />
          Sua sessão permanece ativa e só expira após 5 dias sem abrir o aplicativo.
        </p>
        <div className="mt-4 flex justify-center gap-3 border-t border-base-border pt-4 text-[10px] text-ink-faint">
          <a href="/privacidade" className="hover:text-gray-900">
            Privacidade
          </a>
          <a href="/termos" className="hover:text-gray-900">
            Termos
          </a>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1A10 10 0 0 0 3.1 16.5l3.3-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"
      />
    </svg>
  );
}
