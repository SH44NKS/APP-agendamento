"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  CheckCircle2,
  MessageCircle,
  RotateCcw,
  Send,
  TriangleAlert,
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
  const router = useRouter();
  const [data, setData] = useState(dataAtual ? dataAtual.slice(0, 10) : "");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [motivo, setMotivo] = useState<MotivoOcorrencia | "">("");
  const [detalhe, setDetalhe] = useState("");

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
    router.refresh();
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
  const podeRegistrarOcorrencia = [
    "agendado",
    "aguardando_retorno",
    "pendente",
  ].includes(status);

  return (
    <div className="mt-5 space-y-3">
      <button type="button" onClick={abrirWhatsApp} className="btn-primary w-full bg-green-600 text-white hover:bg-green-500">
        <MessageCircle size={16} /> Abrir conversa no WhatsApp
      </button>
      {!isAdmin && status === "agendado" && (
        <a href={setorWhatsappUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full border-green-300 bg-green-50 text-green-800 hover:bg-green-100">
          <Send size={16} /> Enviar para lançamento no app
        </a>
      )}
      {podeAgendar && (
        <div className="rounded-xl border border-base-border bg-white p-4">
          <label className="text-xs text-ink-muted">Data combinada</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="campo mt-2" />
          <button type="button" onClick={() => post("agendar", { data_hora: data })} disabled={busy || !data} className="btn-secondary mt-3 w-full">
            <CalendarPlus size={16} /> {status === "agendado" ? "Alterar agendamento" : "Confirmar agendamento"}
          </button>
        </div>
      )}
      {calendarUrl && status === "agendado" && (
        <a href={calendarUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full">
          <CalendarPlus size={16} /> Adicionar ao Google Agenda
        </a>
      )}
      {podeRegistrarOcorrencia && (
        <div className="rounded-xl border border-base-border bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <TriangleAlert size={16} className="text-amber-dark" /> Registrar ocorrência
          </div>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoOcorrencia | "")} className="campo mt-3">
            <option value="">Selecione o motivo</option>
            {Object.entries(MOTIVO_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value)} className="campo mt-2 min-h-20" maxLength={500} placeholder="Detalhes adicionais (opcional)" />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy || !motivo} onClick={() => confirm("Enviar esta OS para reagendamento?") && post("status", { status: "reagendar", motivo, detalhe })} className="btn-secondary">
              <RotateCcw size={15} /> Reagendar
            </button>
            {isAdmin && (
              <button type="button" disabled={busy || !motivo} onClick={() => confirm("Cancelar esta OS?") && post("status", { status: "cancelado", motivo, detalhe })} className="btn-secondary border-red-200 text-red-700 hover:bg-red-50">
                Cancelar OS
              </button>
            )}
          </div>
        </div>
      )}
      {!isAdmin && status === "agendado" && (
        <button type="button" onClick={() => post("concluir")} disabled={busy} className="btn-primary w-full">
          <CheckCircle2 size={16} /> Concluir como técnico
        </button>
      )}
      {erro && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{erro}</p>}
    </div>
  );
}
