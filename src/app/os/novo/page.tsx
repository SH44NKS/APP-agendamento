"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { importarTextoOS } from "@/lib/importar-os";
import { STATUS_LABEL } from "@/lib/os";
import { AlertTriangle, ExternalLink } from "lucide-react";
const vazio = {
  tipo: "instalacao",
  prioridade: "padrao",
  cliente_nome: "",
  veiculo_modelo: "",
  veiculo_identificador: "",
  telefone: "",
  local: "",
  tecnico_id: "",
  consultor_nome: "",
  observacoes: "",
};
export default function NovaOSPage() {
  const router = useRouter(),
    [tecnicos, setTecnicos] = useState<{ id: string; nome: string }[]>([]),
    [form, setForm] = useState(vazio),
    [texto, setTexto] = useState(""),
    [enviando, setEnviando] = useState(false),
    [erro, setErro] = useState(""),
    [duplicada, setDuplicada] = useState<{
      id: string;
      status: string;
      cliente_nome: string;
      veiculo_identificador: string;
    } | null>(null);
  useEffect(() => {
    createClient()
      .from("profiles")
      .select("id,nome")
      .eq("papel", "tecnico")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setTecnicos(data ?? []));
  }, []);
  function update(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (campo === "veiculo_identificador") setDuplicada(null);
  }
  function importar() {
    const dados = importarTextoOS(texto);
    setForm((f) => ({
      ...f,
      ...dados,
      cliente_nome:dados.cliente_nome||f.cliente_nome,
      veiculo_modelo:dados.veiculo_modelo||f.veiculo_modelo,
      veiculo_identificador:dados.veiculo_identificador||f.veiculo_identificador,
      telefone:dados.telefone||f.telefone,
      local:dados.local||f.local,
      consultor_nome:dados.consultor_nome||f.consultor_nome,
      tecnico_id: "",
    }));
    setErro("");
    setDuplicada(null);
  }
  const normalizarIdentificador = (valor: string) =>
    valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
  async function salvar() {
    setErro("");
    if (
      !form.cliente_nome ||
      !form.veiculo_modelo ||
      !form.veiculo_identificador ||
      !form.local ||
      !form.consultor_nome ||
      !form.tecnico_id
    ) {
      setErro("Preencha os campos obrigatórios e selecione um técnico.");
      return;
    }
    setEnviando(true);
    const supabase = createClient();
    const identificador = normalizarIdentificador(form.veiculo_identificador);
    const { data: abertas, error: erroConsulta } = await supabase
      .from("ordens_servico")
      .select("id,status,cliente_nome,veiculo_identificador")
      .not("status", "in", "(finalizado,concluido)");
    if (erroConsulta) {
      setEnviando(false);
      setErro(erroConsulta.message);
      return;
    }
    const existente = abertas?.find(
      (os) => normalizarIdentificador(os.veiculo_identificador) === identificador,
    );
    if (existente) {
      setEnviando(false);
      setDuplicada(existente);
      return;
    }
    const { data, error } = await supabase
      .from("ordens_servico")
      .insert(form)
      .select()
      .single();
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.push(`/os/${data.id}`);
  }
  return (
    <main className="min-h-screen bg-base-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => router.back()}
          className="text-xs text-ink-muted"
        >
          ← Voltar
        </button>
        <p className="eyebrow mt-5">LANÇAMENTO RÁPIDO</p>
        <h1 className="mt-2 text-3xl font-bold">Nova ordem de serviço</h1>
        <div className="mt-7 rounded-xl border border-amber/25 bg-amber/5 p-5">
          <label className="text-sm font-semibold">Cole a ordem recebida</label>
          <p className="mt-1 text-xs text-ink-muted">
            Os dados serão preenchidos automaticamente; você escolhe o técnico
            depois.
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="campo mt-3 min-h-40 font-mono text-xs"
            placeholder="📋 ORDEM DE SERVIÇO..."
          />
          <button
            type="button"
            onClick={importar}
            disabled={!texto.trim()}
            className="btn-secondary mt-3"
          >
            Preencher formulário
          </button>
        </div>
        <div className="mt-5 grid gap-4 rounded-xl border border-base-border bg-base-surface p-5 sm:grid-cols-2">
          <Campo label="Serviço *">
            <select
              className="campo"
              value={form.tipo}
              onChange={(e) => update("tipo", e.target.value)}
            >
              <option value="instalacao">Instalação</option>
              <option value="retirada">Retirada</option>
              <option value="manutencao">Manutenção</option>
            </select>
          </Campo>
          <Campo label="Prioridade *">
            <select
              className="campo"
              value={form.prioridade}
              onChange={(e) => update("prioridade", e.target.value)}
            >
              <option value="padrao">Padrão</option>
              <option value="alta">Alta — mostrar no topo</option>
            </select>
          </Campo>
          <Campo label="Cliente *">
            <input
              className="campo"
              value={form.cliente_nome}
              onChange={(e) => update("cliente_nome", e.target.value)}
            />
          </Campo>
          <Campo label="Telefone">
            <input
              className="campo"
              value={form.telefone}
              onChange={(e) => update("telefone", e.target.value)}
            />
          </Campo>
          <Campo label="Modelo do veículo *">
            <input
              className="campo"
              value={form.veiculo_modelo}
              onChange={(e) => update("veiculo_modelo", e.target.value)}
            />
          </Campo>
          <Campo label="Placa ou chassi *">
            <input
              className="campo font-mono"
              value={form.veiculo_identificador}
              onChange={(e) => update("veiculo_identificador", e.target.value)}
            />
          </Campo>
          <Campo label="Local *">
            <input
              className="campo"
              value={form.local}
              onChange={(e) => update("local", e.target.value)}
            />
          </Campo>
          <Campo label="Consultor *">
            <input
              className="campo"
              value={form.consultor_nome}
              onChange={(e) => update("consultor_nome", e.target.value)}
            />
          </Campo>
          <Campo label="Técnico responsável *">
            <select
              className="campo"
              value={form.tecnico_id}
              onChange={(e) => update("tecnico_id", e.target.value)}
            >
              <option value="">Selecione o técnico</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Observações">
            <input
              className="campo"
              value={form.observacoes}
              onChange={(e) => update("observacoes", e.target.value)}
            />
          </Campo>
          <div className="sm:col-span-2">
            {duplicada && (
              <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-dark" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Esta OS já existe no sistema</p>
                    <p className="mt-1 text-xs">
                      {duplicada.cliente_nome} · {duplicada.veiculo_identificador} · Status: <b>{STATUS_LABEL[duplicada.status] ?? duplicada.status}</b>
                    </p>
                    <button type="button" onClick={() => router.push(`/os/${duplicada.id}`)} className="btn-secondary mt-3 border-amber-300 bg-white">
                      <ExternalLink size={15} /> Ver OS existente
                    </button>
                  </div>
                </div>
              </div>
            )}
            {erro && (
              <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-300">
                {erro}
              </p>
            )}
            <button
              onClick={salvar}
              disabled={enviando}
              className="btn-primary w-full"
            >
              {enviando ? "Criando..." : "Criar ordem de serviço"}
            </button>
          </div>
        </div>
      </div>
    </main>
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
      <span className="mb-1.5 block text-xs text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
