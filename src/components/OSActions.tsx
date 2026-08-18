"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarPlus,
  CheckCircle2,
  Flame,
  MessageCircle,
  RotateCcw,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import { MOTIVO_LABEL, MotivoOcorrencia } from "@/lib/os";

type Props = {
  osId: string;
  whatsappUrl: string;
  setorWhatsappUrl: string;
  calendarUrl: string | null;
  dataAtual: string | null;
  status: string;
  isAdmin: boolean;
  critico?: boolean;
};

type AplicativoWhatsApp = "normal" | "business";
type DestinoWhatsApp = "cliente" | "setor";

const PACOTES_WHATSAPP: Record<AplicativoWhatsApp, string> = {
  normal: "com.whatsapp",
  business: "com.whatsapp.w4b",
};

export function OSActions({
  osId,
  whatsappUrl,
  setorWhatsappUrl,
  calendarUrl,
  dataAtual,
  status,
  isAdmin,
  critico = false,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState(dataAtual ? dataAtual.slice(0, 10) : "");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [motivo, setMotivo] = useState<MotivoOcorrencia | "">("");
  const [detalhe, setDetalhe] = useState("");
  const [escolhendoWhatsApp, setEscolhendoWhatsApp] =
    useState<DestinoWhatsApp | null>(null);

  async function post(acao: string, body?: object) {
    setBusy(true);
    setErro("");
    const res = await fetch(`/api/os/${osId}/${acao}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      keepalive: true,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErro(json.error ?? "Não foi possível salvar.");
      return;
    }
    router.refresh();
  }

  function abrirWhatsApp(aplicativo: AplicativoWhatsApp) {
    const destino = escolhendoWhatsApp;
    const url = destino === "setor" ? setorWhatsappUrl : whatsappUrl;
    setEscolhendoWhatsApp(null);

    if (destino === "cliente" && !isAdmin && status === "pendente") {
      void post("status", { status: "aguardando_retorno" });
    }

    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = criarIntentWhatsApp(
        url,
        PACOTES_WHATSAPP[aplicativo],
      );
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  const podeAgendar = [
    "aguardando_retorno",
    "pendente",
    "reagendar",
    "agendado",
  ].includes(status);
  const podeRegistrarOcorrencia = [
    "agendado",
    "aguardando_retorno",
    "pendente",
  ].includes(status);

  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={() =>
          setEscolhendoWhatsApp((aberto) =>
            aberto === "cliente" ? null : "cliente",
          )
        }
        aria-expanded={escolhendoWhatsApp === "cliente"}
        className="btn-primary w-full bg-green-600 text-white hover:bg-green-500"
      >
        <MessageCircle size={16} />
        Abrir conversa no WhatsApp
      </button>

      {escolhendoWhatsApp === "cliente" && (
        <SeletorWhatsApp
          descricao="A mensagem e o número do cliente já estão preenchidos."
          onEscolher={abrirWhatsApp}
          onFechar={() => setEscolhendoWhatsApp(null)}
        />
      )}

      {!isAdmin && status === "agendado" && (
        <button
          type="button"
          onClick={() =>
            setEscolhendoWhatsApp((aberto) =>
              aberto === "setor" ? null : "setor",
            )
          }
          aria-expanded={escolhendoWhatsApp === "setor"}
          className="btn-secondary w-full border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
        >
          <Send size={16} />
          Enviar para lançamento no app
        </button>
      )}

      {!isAdmin && status === "agendado" && escolhendoWhatsApp === "setor" && (
        <SeletorWhatsApp
          descricao="A mensagem da OS e o número do setor já estão preenchidos."
          onEscolher={abrirWhatsApp}
          onFechar={() => setEscolhendoWhatsApp(null)}
        />
      )}

      {!isAdmin &&
        critico &&
        ["pendente", "aguardando_retorno", "reagendar"].includes(status) && (
          <div className="rounded-xl border border-orange-300 bg-gradient-to-br from-orange-100 to-white p-4">
            <div className="flex items-start gap-2 text-orange-900">
              <Flame size={17} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-extrabold">OS crítica</h2>
                <p className="mt-1 text-xs leading-5 text-orange-900/75">
                  Depois de falar novamente com o associado, registre o contato
                  para atualizar a movimentação desta OS.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => post("recontato")}
              disabled={busy}
              className="btn-secondary mt-3 w-full border-orange-300 bg-white text-orange-900 hover:bg-orange-100"
            >
              <CheckCircle2 size={16} />
              {busy ? "Registrando..." : "Registrar novo contato"}
            </button>
          </div>
        )}

      {podeAgendar && (
        <div className="rounded-xl border border-base-border bg-white p-4">
          <label className="text-xs text-ink-muted">Data combinada</label>
          <input
            type="date"
            value={data}
            onChange={(event) => setData(event.target.value)}
            className="campo mt-2"
          />
          <button
            type="button"
            onClick={() => post("agendar", { data_hora: data })}
            disabled={busy || !data}
            className="btn-secondary mt-3 w-full"
          >
            <CalendarPlus size={16} />
            {status === "agendado" ? "Alterar agendamento" : "Confirmar agendamento"}
          </button>
        </div>
      )}

      {calendarUrl && status === "agendado" && (
        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary w-full"
        >
          <CalendarPlus size={16} />
          Adicionar ao Google Agenda
        </a>
      )}

      {podeRegistrarOcorrencia && (
        <div className="rounded-xl border border-base-border bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <TriangleAlert size={16} className="text-amber-dark" />
            Registrar ocorrência
          </div>
          <select
            value={motivo}
            onChange={(event) =>
              setMotivo(event.target.value as MotivoOcorrencia | "")
            }
            className="campo mt-3"
          >
            <option value="">Selecione o motivo</option>
            {Object.entries(MOTIVO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <textarea
            value={detalhe}
            onChange={(event) => setDetalhe(event.target.value)}
            className="campo mt-2 min-h-20"
            maxLength={500}
            placeholder="Detalhes adicionais (opcional)"
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy || !motivo}
              onClick={() =>
                confirm("Enviar esta OS para reagendamento?") &&
                post("status", { status: "reagendar", motivo, detalhe })
              }
              className="btn-secondary"
            >
              <RotateCcw size={15} />
              Reagendar
            </button>
            {isAdmin && (
              <button
                type="button"
                disabled={busy || !motivo}
                onClick={() =>
                  confirm("Cancelar esta OS?") &&
                  post("status", { status: "cancelado", motivo, detalhe })
                }
                className="btn-secondary border-red-200 text-red-700 hover:bg-red-50"
              >
                Cancelar OS
              </button>
            )}
          </div>
        </div>
      )}

      {!isAdmin && status === "agendado" && (
        <button
          type="button"
          onClick={() => post("concluir")}
          disabled={busy}
          className="btn-primary w-full"
        >
          <CheckCircle2 size={16} />
          Concluir como técnico
        </button>
      )}

      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}

function SeletorWhatsApp({
  descricao,
  onEscolher,
  onFechar,
}: {
  descricao: string;
  onEscolher: (aplicativo: AplicativoWhatsApp) => void;
  onFechar: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Escolher aplicativo do WhatsApp"
      className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-[0_10px_30px_rgba(17,24,39,.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-green-900">
            Por qual aplicativo deseja enviar?
          </h2>
          <p className="mt-1 text-xs leading-5 text-green-800/80">
            {descricao}
          </p>
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar seleção do WhatsApp"
          className="rounded-md p-1.5 text-green-800 hover:bg-green-100"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => onEscolher("normal")}
          className="btn-secondary w-full justify-start border-green-300 bg-white text-green-900 hover:bg-green-100"
        >
          <MessageCircle size={17} className="text-green-600" />
          WhatsApp pessoal
        </button>
        <button
          type="button"
          onClick={() => onEscolher("business")}
          className="btn-secondary w-full justify-start border-green-300 bg-white text-green-900 hover:bg-green-100"
        >
          <BriefcaseBusiness size={17} className="text-green-700" />
          WhatsApp de trabalho (Business)
        </button>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-green-900/70">
        A escolha direta funciona em celulares Android. Em iPhone ou computador,
        será usado o WhatsApp padrão configurado no aparelho.
      </p>
    </div>
  );
}

function criarIntentWhatsApp(urlWeb: string, pacote: string) {
  const url = new URL(urlWeb);
  const numero = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const texto = url.searchParams.get("text") ?? "";
  const fallback = encodeURIComponent(urlWeb);
  return `intent://send?phone=${encodeURIComponent(numero)}&text=${encodeURIComponent(texto)}#Intent;scheme=whatsapp;package=${pacote};S.browser_fallback_url=${fallback};end`;
}
