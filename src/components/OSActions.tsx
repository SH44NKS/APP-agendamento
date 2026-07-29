"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  CheckCircle2,
  MessageCircle,
  RotateCcw,
  Send,
} from "lucide-react";

type Props = {
  osId: string;
  whatsappUrl: string;
  setorWhatsappUrl: string;
  calendarUrl: string | null;
  dataAtual: string | null;
  status: string;
  isAdmin: boolean;
};
export function OSActions({
  osId,
  whatsappUrl,
  setorWhatsappUrl,
  calendarUrl,
  dataAtual,
  status,
  isAdmin,
}: Props) {
  const r = useRouter(),
    [data, setData] = useState(dataAtual ? dataAtual.slice(0, 16) : ""),
    [busy, setBusy] = useState(false),
    [erro, setErro] = useState("");
  async function post(acao: string, body?: object) {
    setBusy(true);
    setErro("");
    const res = await fetch(`/api/os/${osId}/${acao}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErro(json.error ?? "Não foi possível salvar.");
      return;
    }
    r.refresh();
  }
  function abrirWhatsApp() {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (!isAdmin && status === "pendente")
      void post("status", { status: "aguardando_retorno" });
  }
  const podeAgendar = [
    "aguardando_retorno",
    "pendente",
    "reagendar",
    "agendado",
  ].includes(status);
  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={abrirWhatsApp}
        className="btn-primary w-full bg-green-600 text-white hover:bg-green-500"
      >
        <MessageCircle size={16} />
        Abrir conversa no WhatsApp
      </button>
      {!isAdmin && status === "agendado" && (
        <a
          href={setorWhatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary w-full border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
        >
          <Send size={16} />
          Enviar para lançamento no app
        </a>
      )}
      {podeAgendar && (
        <div className="rounded-xl border border-base-border bg-white p-4">
          <label className="text-xs text-ink-muted">
            Data e hora combinadas
          </label>
          <input
            type="datetime-local"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="campo mt-2"
          />
          <button
            onClick={() => post("agendar", { data_hora: data })}
            disabled={busy || !data}
            className="btn-secondary mt-3 w-full"
          >
            <CalendarPlus size={16} />
            {status === "agendado"
              ? "Alterar agendamento"
              : "Confirmar agendamento"}
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
      {!isAdmin && status === "agendado" && (
        <>
          <button
            onClick={() => post("concluir")}
            disabled={busy}
            className="btn-primary w-full"
          >
            <CheckCircle2 size={16} />
            Concluir como técnico
          </button>
          <button
            onClick={() =>
              confirm("Este serviço precisa ser reagendado?") &&
              post("status", { status: "reagendar" })
            }
            disabled={busy}
            className="btn-secondary w-full"
          >
            <RotateCcw size={16} />
            Reagendar serviço
          </button>
        </>
      )}
      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
