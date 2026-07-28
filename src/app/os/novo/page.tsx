"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NovaOSPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tecnicos, setTecnicos] = useState<{ id: string; nome: string }[]>([]);
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState({
    tipo: "instalacao",
    cliente_nome: "",
    veiculo_modelo: "",
    veiculo_identificador: "",
    telefone: "",
    local: "",
    tecnico_id: "",
    consultor_nome: "",
  });

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nome")
      .eq("papel", "tecnico")
      .then(({ data }) => setTecnicos(data ?? []));
  }, []);

  function update(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar() {
    setEnviando(true);
    const { data, error } = await supabase
      .from("ordens_servico")
      .insert(form)
      .select()
      .single();
    setEnviando(false);
    if (!error && data) router.push(`/os/${data.id}`);
  }

  return (
    <main className="min-h-screen bg-base-bg px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold">Nova ordem de serviço</h1>

        <div className="mt-6 flex flex-col gap-4">
          <Campo label="Tipo de serviço">
            <select
              value={form.tipo}
              onChange={(e) => update("tipo", e.target.value)}
              className="campo"
            >
              <option value="instalacao">Instalação</option>
              <option value="retirada">Retirada</option>
              <option value="manutencao">Manutenção</option>
            </select>
          </Campo>

          <Campo label="Cliente">
            <input
              className="campo"
              value={form.cliente_nome}
              onChange={(e) => update("cliente_nome", e.target.value)}
              placeholder="Ex: Sumaré Estacionamento LTDA"
            />
          </Campo>

          <Campo label="Modelo do veículo">
            <input
              className="campo"
              value={form.veiculo_modelo}
              onChange={(e) => update("veiculo_modelo", e.target.value)}
              placeholder="Ex: YBR 150 FACTOR FLEX"
            />
          </Campo>

          <Campo label="Placa ou chassi (zero km)">
            <input
              className="campo font-mono"
              value={form.veiculo_identificador}
              onChange={(e) => update("veiculo_identificador", e.target.value)}
            />
          </Campo>

          <Campo label="Telefone do associado">
            <input
              className="campo"
              value={form.telefone}
              onChange={(e) => update("telefone", e.target.value)}
              placeholder="71991693993"
            />
          </Campo>

          <Campo label="Local">
            <input
              className="campo"
              value={form.local}
              onChange={(e) => update("local", e.target.value)}
              placeholder="Ex: Caminho das Árvores - Salvador"
            />
          </Campo>

          <Campo label="Técnico">
            <select
              value={form.tecnico_id}
              onChange={(e) => update("tecnico_id", e.target.value)}
              className="campo"
            >
              <option value="">Selecione</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Consultor solicitante">
            <input
              className="campo"
              value={form.consultor_nome}
              onChange={(e) => update("consultor_nome", e.target.value)}
            />
          </Campo>

          <button
            onClick={salvar}
            disabled={enviando}
            className="mt-2 w-full rounded-lg bg-amber py-3 text-sm font-semibold text-base-bg transition hover:opacity-90 disabled:opacity-40"
          >
            Criar e enviar para o técnico
          </button>
        </div>
      </div>
    </main>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
