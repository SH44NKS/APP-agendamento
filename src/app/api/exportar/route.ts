import { createClient } from "@/lib/supabase/server";
import { TIPO_LABEL } from "@/lib/os";
import { isAdminUser } from "@/lib/auth";
const q = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
export async function GET() {
  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });
  const { data: p } = await s
    .from("profiles")
    .select("papel")
    .eq("id", user.id)
    .single();
  if (!isAdminUser(user.email, p?.papel))
    return new Response("Sem permissão", { status: 403 });
  const { data } = await s
    .from("ordens_servico")
    .select("*, tecnico:tecnico_id(nome)")
    .order("criado_em", { ascending: false });
  const head = [
    "Serviço",
    "Status",
    "Cliente",
    "Veículo",
    "Placa/Chassi",
    "Telefone",
    "Local",
    "Técnico",
    "Consultor",
    "Criada em",
    "Agendada para",
    "Concluída em",
  ];
  const rows = (data ?? []).map((o) => [
    TIPO_LABEL[o.tipo as keyof typeof TIPO_LABEL],
    o.status,
    o.cliente_nome,
    o.veiculo_modelo,
    o.veiculo_identificador,
    o.telefone,
    o.local,
    o.tecnico?.nome,
    o.consultor_nome,
    o.criado_em,
    o.data_hora_agendada,
    o.concluido_em,
  ]);
  const csv =
    "\ufeff" + [head, ...rows].map((r) => r.map(q).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ordens-servico-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
