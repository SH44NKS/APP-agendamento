"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, ShieldCheck, UserRound, X } from "lucide-react";
import { PainelDestaque } from "./PainelDestaque";

type Pessoa = {
  id: string;
  nome: string;
  email: string;
  papel: "admin" | "tecnico";
  ativo: boolean;
  criado_em: string;
};

const MASTER = "alissons.silva25@gmail.com";

export function EquipeManager({ pessoas }: { pessoas: Pessoa[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState("");

  const administradores = pessoas.filter((pessoa) => pessoa.papel === "admin");
  const tecnicos = pessoas.filter((pessoa) => pessoa.papel === "tecnico");

  async function mudar(pessoa: Pessoa, body: object) {
    setBusy(pessoa.id);
    setErro("");

    const res = await fetch(`/api/equipe/${pessoa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));

    setBusy(null);
    if (!res.ok) {
      setErro(json.error ?? "Não foi possível atualizar.");
      return false;
    }

    router.refresh();
    return true;
  }

  function editar(pessoa: Pessoa) {
    setEditando(pessoa.id);
    setNome(pessoa.nome);
    setErro("");
  }

  async function salvarNome(pessoa: Pessoa) {
    if (await mudar(pessoa, { nome })) setEditando(null);
  }

  function linhaPessoa(pessoa: Pessoa) {
    const master = pessoa.email.toLowerCase() === MASTER;
    const estaEditando = editando === pessoa.id;

    return (
      <tr key={pessoa.id} className="border-b border-base-border/60 last:border-0">
        <td className="p-4">
          {estaEditando ? (
            <div className="flex max-w-md items-center gap-2">
              <input
                className="campo"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                maxLength={80}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") void salvarNome(pessoa);
                  if (event.key === "Escape") setEditando(null);
                }}
              />
              <button
                type="button"
                aria-label="Salvar nome"
                title="Salvar nome"
                disabled={busy === pessoa.id || nome.trim().length < 2}
                className="btn-primary px-3"
                onClick={() => salvarNome(pessoa)}
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                aria-label="Cancelar edição"
                title="Cancelar"
                className="btn-secondary px-3"
                onClick={() => setEditando(null)}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <b>{pessoa.nome}</b>
              {master && (
                <span className="rounded-full bg-amber/15 px-2 py-1 text-[9px] font-bold text-amber">
                  MASTER
                </span>
              )}
              <button
                type="button"
                aria-label={`Editar nome de ${pessoa.nome}`}
                title="Editar nome"
                className="rounded-md p-1.5 text-ink-muted hover:bg-base-surface2 hover:text-gray-900"
                onClick={() => editar(pessoa)}
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <small className="block text-ink-faint">{pessoa.email}</small>
        </td>
        <td className="p-4 capitalize">{pessoa.papel === "admin" ? "Administrador" : "Técnico"}</td>
        <td className="p-4">{pessoa.ativo ? "Ativo" : "Desativado"}</td>
        <td className="p-4 text-right">
          <div className="flex justify-end gap-2">
            {!master && (
              <>
                <button
                  disabled={busy === pessoa.id}
                  className="btn-secondary"
                  onClick={() =>
                    mudar(pessoa, {
                      papel: pessoa.papel === "admin" ? "tecnico" : "admin",
                    })
                  }
                >
                  {pessoa.papel === "admin" ? "Tornar técnico" : "Tornar admin"}
                </button>
                <button
                  disabled={busy === pessoa.id}
                  className="btn-secondary"
                  onClick={() => mudar(pessoa, { ativo: !pessoa.ativo })}
                >
                  {pessoa.ativo ? "Desativar" : "Ativar"}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="mt-7 space-y-6">
      <PainelDestaque
        Icone={ShieldCheck}
        titulo="Administradores"
        descricao="Acesso completo à operação e à equipe"
        contador={administradores.length}
        tema="amarelo"
        conteudoClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-base-border text-[10px] uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="p-4">Pessoa</th>
              <th className="p-4">Papel</th>
              <th className="p-4">Acesso</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>{administradores.map(linhaPessoa)}</tbody>
        </table>
      </PainelDestaque>

      <PainelDestaque
        Icone={UserRound}
        titulo="Técnicos"
        descricao="Equipe disponível para receber ordens de serviço"
        contador={tecnicos.length}
        tema="azul"
        conteudoClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-base-border text-[10px] uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="p-4">Pessoa</th>
              <th className="p-4">Papel</th>
              <th className="p-4">Acesso</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>{tecnicos.map(linhaPessoa)}</tbody>
        </table>
      </PainelDestaque>

      {erro && <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-700">{erro}</p>}
    </div>
  );
}
