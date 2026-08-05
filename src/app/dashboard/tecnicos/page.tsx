import { differenceInHours } from "date-fns";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth";
import { chaveMesBahia, FUSO_SISTEMA } from "@/lib/datetime";

type Tecnico = { id: string; nome: string; email: string; ativo: boolean };
type Ordem = {
  tecnico_id: string | null;
  status: string;
  criado_em: string;
  data_hora_agendada: string | null;
  concluido_em: string | null;
  concluido_tecnico_em: string | null;
};

export default async function TecnicosPage() {
  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  const { data: perfil } = await s
    .from("profiles")
    .select("id,nome,email,papel,ativo")
    .eq("id", user?.id)
    .maybeSingle();
  const admin = isAdminUser(user?.email, perfil?.papel);
  const [tecnicosResult, ordensResult] = await Promise.all([
    admin
      ? s
          .from("profiles")
          .select("id,nome,email,ativo")
          .eq("papel", "tecnico")
          .order("nome")
      : Promise.resolve({ data: perfil ? [perfil] : [] }),
    admin
      ? s
          .from("ordens_servico")
          .select("tecnico_id,status,criado_em,data_hora_agendada,concluido_em,concluido_tecnico_em")
          .order("criado_em", { ascending: false })
      : s
          .from("ordens_servico")
          .select("tecnico_id,status,criado_em,data_hora_agendada,concluido_em,concluido_tecnico_em")
          .eq("tecnico_id", user?.id)
          .order("criado_em", { ascending: false }),
  ]);
  const tecnicos = (tecnicosResult.data ?? []) as Tecnico[];
  const ordens = (ordensResult.data ?? []) as Ordem[];
  const meses = mesesPresentes(ordens);

  return (
    <div>
      <p className="eyebrow">
        {admin ? "DESEMPENHO DA EQUIPE" : "MEU DESEMPENHO"}
      </p>
      <h1 className="mt-2 text-3xl font-bold">Relatório por técnico</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {admin
          ? "Resultados mensais de toda a equipe."
          : "Somente os seus serviços, organizados mês a mês."}
      </p>
      <div className="mt-7 space-y-6">
        {meses.map((mes) => {
          const ordensMes = ordens.filter((o) => chaveMes(o.criado_em) === mes);
          const idsComMovimento = new Set(ordensMes.map((o) => o.tecnico_id));
          const linhas = admin
            ? tecnicos.filter((t) => idsComMovimento.has(t.id))
            : tecnicos;
          return (
            <section
              key={mes}
              className="overflow-hidden rounded-xl border border-base-border bg-white shadow-[0_10px_30px_rgba(17,24,39,.06)]"
            >
              <header className="flex items-center justify-between border-b border-base-border bg-base-surface2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-amber-dark" />
                  <h2 className="text-sm font-extrabold capitalize">
                    {nomeMes(mes)}
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-ink-muted">
                  {ordensMes.length} serviço(s)
                </span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-base-border bg-white text-[10px] uppercase tracking-wider text-ink-faint">
                    <tr>
                      <Th>Técnico</Th>
                      <Th>Pendentes</Th>
                      <Th>Agendadas</Th>
                      <Th>Concluídas</Th>
                      <Th>Até agendar</Th>
                      <Th>Até concluir</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((t) => (
                      <Linha
                        key={t.id}
                        tecnico={t}
                        ordens={ordensMes.filter((o) => o.tecnico_id === t.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {linhas.length === 0 && (
                <p className="p-8 text-center text-sm text-ink-muted">
                  Nenhum serviço atribuído neste mês.
                </p>
              )}
            </section>
          );
        })}
        {meses.length === 0 && (
          <div className="empty-state">
            Nenhum serviço encontrado para gerar o relatório.
          </div>
        )}
      </div>
    </div>
  );
}

function Linha({ tecnico, ordens }: { tecnico: Tecnico; ordens: Ordem[] }) {
  const ag = ordens.filter((o) => o.data_hora_agendada),
    co = ordens.filter((o) => o.concluido_tecnico_em||o.concluido_em);
  return (
    <tr className="border-b border-base-border/60 last:border-0">
      <td className="p-4">
        <b>{tecnico.nome}</b>
        <small className="block text-ink-faint">{tecnico.email}</small>
      </td>
      <Td>{ordens.filter((o) => ["aguardando_retorno","pendente","reagendar"].includes(o.status)).length}</Td>
      <Td>{ordens.filter((o) => o.status === "agendado").length}</Td>
      <Td>{co.length}</Td>
      <Td>
        {media(
          ag.map((o) =>
            differenceInHours(
              new Date(o.data_hora_agendada!),
              new Date(o.criado_em),
            ),
          ),
        )}
      </Td>
      <Td>
        {media(
          co.map((o) =>
            differenceInHours(new Date(o.concluido_tecnico_em||o.concluido_em!),new Date(o.criado_em)),
          ),
        )}
      </Td>
    </tr>
  );
}
function chaveMes(data: string) {
  return chaveMesBahia(data);
}
function mesesPresentes(ordens: Ordem[]) {
  return [...new Set(ordens.map((o) => chaveMes(o.criado_em)))].sort((a, b) =>
    b.localeCompare(a),
  );
}
function nomeMes(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: FUSO_SISTEMA,
  }).format(new Date(`${ano}-${String(mes).padStart(2, "0")}-15T12:00:00-03:00`));
}
function media(valores: number[]) {
  if (!valores.length) return "—";
  const horas = Math.max(
    0,
    Math.round(valores.reduce((a, b) => a + b, 0) / valores.length),
  );
  return horas < 24 ? `${horas}h` : `${(horas / 24).toFixed(1)}d`;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-4">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-4 font-semibold">{children}</td>;
}
