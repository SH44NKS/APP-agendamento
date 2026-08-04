import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizarData(data: unknown) {
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const valor = `${data}T12:00:00-03:00`;
  return Number.isNaN(new Date(valor).getTime()) ? null : valor;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { data_hora } = await request.json();
  const dataAgendada = normalizarData(data_hora);
  if (!dataAgendada) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { error } = await s
    .from("ordens_servico")
    .update({
      data_hora_agendada: dataAgendada,
      status: "agendado",
      google_event_id: null,
      concluido_tecnico_em: null,
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
