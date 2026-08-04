"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, RotateCcw, Save, Trash2, X } from "lucide-react";
import type { OrdemServico } from "@/lib/os";

export function AdminOSEditor({
  os,
  tecnicos,
}: {
  os: OrdemServico;
  tecnicos: { id: string; nome: string }[];
}) {
  const r = useRouter(),
    [editando, setEditando] = useState(false),
    [busy, setBusy] = useState(false),
    [erro, setErro] = useState("");
  const [form, setForm] = useState({
    ...os,
    data_hora_agendada: os.data_hora_agendada?.slice(0, 10) ?? "",
  });
  function set(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  async function salvar(body: object = form) {
    setBusy(true);
    setErro("");
    const res = await fetch(`/api/os/${os.id}/atualizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErro(json.error ?? "Não foi possível salvar.");
      return;
    }
    setEditando(false);
    r.refresh();
  }
  async function apagar() {
    if (
      !confirm(
        "Apagar definitivamente esta ordem de serviço? Esta ação não pode ser desfeita.",
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/os/${os.id}/atualizar`, { method: "DELETE" });
    if (res.ok) {
      r.push("/dashboard");
      r.refresh();
      return;
    }
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setErro(json.error ?? "Não foi possível apagar.");
  }
  if (!editando)
    return (
      <div className="space-y-2">
        <button
          onClick={() => setEditando(true)}
          className="btn-secondary w-full"
        >
          <Pencil size={16} />
          Editar qualquer informação
        </button>
        {os.status === "concluido_tecnico" && (
          <button
            onClick={() => salvar({ status: "finalizado" })}
            className="btn-primary w-full"
          >
            <CheckCircle2 size={16} />
            Finalizar OS
          </button>
        )}
        {["concluido_tecnico", "agendado"].includes(os.status) && (
          <button
            onClick={() => salvar({ status: "reagendar" })}
            className="btn-secondary w-full"
          >
            <RotateCcw size={16} />
            Enviar para reagendamento
          </button>
        )}
        <button
          onClick={apagar}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700"
        >
          <Trash2 size={16} />
          Apagar OS
        </button>
        {erro && <p className="text-xs text-red-700">{erro}</p>}
      </div>
    );
  return (
    <div className="rounded-xl border border-amber bg-amber/5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <b className="text-sm">Editar OS</b>
        <button onClick={() => setEditando(false)}>
          <X size={17} />
        </button>
      </div>
      <div className="space-y-3">
        <Campo label="Serviço">
          <select
            className="campo"
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value)}
          >
            <option value="instalacao">Instalação</option>
            <option value="retirada">Retirada</option>
            <option value="manutencao">Manutenção</option>
          </select>
        </Campo>
        <Campo label="Prioridade">
          <select
            className="campo"
            value={form.prioridade}
            onChange={(e) => set("prioridade", e.target.value)}
          >
            <option value="padrao">Padrão</option>
            <option value="alta">Alta</option>
          </select>
        </Campo>
        <Campo label="Status">
            <select
              className="campo"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="pendente">Pendente</option>
              <option value="aguardando_retorno">Aguardando retorno</option>
            <option value="agendado">Agendado</option>
            <option value="reagendar">Reagendar</option>
            <option value="concluido_tecnico">Concluído técnico</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </Campo>
        <Campo label="Cliente">
          <input
            className="campo"
            value={form.cliente_nome}
            onChange={(e) => set("cliente_nome", e.target.value)}
          />
        </Campo>
        <Campo label="Modelo">
          <input
            className="campo"
            value={form.veiculo_modelo}
            onChange={(e) => set("veiculo_modelo", e.target.value)}
          />
        </Campo>
        <Campo label="Placa ou chassi">
          <input
            className="campo"
            value={form.veiculo_identificador}
            onChange={(e) => set("veiculo_identificador", e.target.value)}
          />
        </Campo>
        <Campo label="Telefone">
          <input
            className="campo"
            value={form.telefone ?? ""}
            onChange={(e) => set("telefone", e.target.value)}
          />
        </Campo>
        <Campo label="Local">
          <input
            className="campo"
            value={form.local}
            onChange={(e) => set("local", e.target.value)}
          />
        </Campo>
        <Campo label="Consultor">
          <input
            className="campo"
            value={form.consultor_nome}
            onChange={(e) => set("consultor_nome", e.target.value)}
          />
        </Campo>
        <Campo label="Técnico">
          <select
            className="campo"
            value={form.tecnico_id ?? ""}
            onChange={(e) => set("tecnico_id", e.target.value)}
          >
            <option value="">Sem técnico</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Data agendada">
          <input
            type="date"
            className="campo"
            value={form.data_hora_agendada ?? ""}
            onChange={(e) => set("data_hora_agendada", e.target.value)}
          />
        </Campo>
        <Campo label="Observações da OS">
          <textarea
            className="campo min-h-24"
            value={form.observacoes ?? ""}
            onChange={(e) => set("observacoes", e.target.value)}
          />
        </Campo>
        <button
          disabled={busy}
          onClick={() => salvar()}
          className="btn-primary w-full"
        >
          <Save size={16} />
          Salvar alterações
        </button>
        {erro && <p className="text-xs text-red-700">{erro}</p>}
      </div>
    </div>
  );
}
function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
