import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { OSCard } from "@/components/OSCard";
export default async function TecnicoPage() {
  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  const [{ data: ordens }, { data: perfil }] = await Promise.all([
    s
      .from("ordens_servico")
      .select("*")
      .eq("tecnico_id", user?.id)
      .order("criado_em", { ascending: false }),
    s.from("profiles").select("nome").eq("id", user?.id).single(),
  ]);
  const lista = ordens ?? [],
    abertas = lista
      .filter((o) => !["finalizado","concluido","cancelado"].includes(o.status))
      .sort(
        (a, b) =>
          Number(b.prioridade === "alta") - Number(a.prioridade === "alta"),
      ),
    concluidas = lista.filter((o) => ["finalizado","concluido"].includes(o.status));
  return (
    <main className="min-h-screen bg-base-bg px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between rounded-xl border border-base-border bg-white p-3 shadow-sm">
          <Link href="/tecnico" className="flex items-center gap-3">
            <span className="brand-mark">FE</span>
            <div>
              <b className="text-sm font-extrabold text-gray-900">
                APP agendamento
              </b>
              <p className="font-mono text-[9px] uppercase tracking-[.14em] text-ink-muted">
                Foco & Escudo
              </p>
            </div>
          </Link>
          <LogoutButton icon={<LogOut size={16} />} />
        </header>
        <p className="eyebrow mt-9">MINHA AGENDA</p>
        <h1 className="mt-2 text-2xl font-extrabold">
          Olá, {perfil?.nome?.split(" ")[0] ?? "técnico"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Seus serviços em aberto, com prioridades altas primeiro.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {abertas.map((os) => (
            <OSCard key={os.id} os={os as any} />
          ))}
          {abertas.length === 0 && (
            <div className="empty-state">
              Nenhum serviço em aberto no momento.
            </div>
          )}
        </div>
        {concluidas.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-semibold text-ink-muted">
              Concluídos ({concluidas.length})
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {concluidas.map((os) => (
                <OSCard key={os.id} os={os as any} />
              ))}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
