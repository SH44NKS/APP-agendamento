import { createClient } from "@/lib/supabase/server";
import { OSCard } from "@/components/OSCard";

export default async function TecnicoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ordens } = await supabase
    .from("ordens_servico")
    .select("*")
    .eq("tecnico_id", user?.id)
    .order("criado_em", { ascending: false });

  const lista = ordens ?? [];
  const emAberto = lista
    .filter((os) => os.status !== "concluido" && os.status !== "cancelado")
    .sort((a, b) => Number(b.prioridade === "alta") - Number(a.prioridade === "alta"));
  const concluidas = lista.filter((os) => os.status === "concluido");

  return (
    <main className="min-h-screen bg-base-bg px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold">Meus serviços</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Toque em um serviço para ver os detalhes e falar com o associado.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {emAberto.map((os) => (
            <OSCard key={os.id} os={os as any} />
          ))}
          {emAberto.length === 0 && (
            <p className="text-sm text-ink-muted">Nenhum serviço em aberto no momento 🎉</p>
          )}
        </div>

        {concluidas.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer font-display text-sm font-semibold text-ink-muted">
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
