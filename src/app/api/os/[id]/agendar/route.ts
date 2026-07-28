import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { data_hora } = await request.json();
  if (!data_hora || Number.isNaN(new Date(data_hora).getTime())) {
    return NextResponse.json({ error: "Data e hora inválidas" }, { status: 400 });
  }
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data: os } = await supabase
    .from("ordens_servico")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("google_refresh_token")
    .eq("id", user.id)
    .single();

  let googleEventId: string | null = null;

  // Cria o evento na agenda do técnico, se ele conectou a conta Google.
  // Falha aqui não deve travar o agendamento — a OS é o dado que importa.
  if (perfil?.google_refresh_token) {
    try {
      googleEventId = await criarEventoGoogle(perfil.google_refresh_token, os, data_hora);
    } catch (e) {
      console.error("Falha ao criar evento no Google Agenda:", e);
    }
  }

  const { error: updateError } = await supabase
    .from("ordens_servico")
    .update({
      data_hora_agendada: data_hora,
      status: "agendado",
      google_event_id: googleEventId,
    })
    .eq("id", params.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

async function criarEventoGoogle(refreshToken: string, os: any, dataHora: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const { access_token } = await tokenRes.json();
  if (!tokenRes.ok || !access_token) throw new Error("Não foi possível renovar o acesso ao Google Agenda");

  const inicio = new Date(dataHora);
  const fim = new Date(inicio.getTime() + 60 * 60 * 1000); // bloco de 1h

  const eventRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `${os.tipo.toUpperCase()} — ${os.cliente_nome}`,
        description: `Veículo: ${os.veiculo_modelo} (${os.veiculo_identificador})\nLocal: ${os.local}\nConsultor: ${os.consultor_nome}`,
        location: os.local,
        start: { dateTime: inicio.toISOString(), timeZone: "America/Bahia" },
        end: { dateTime: fim.toISOString(), timeZone: "America/Bahia" },
        reminders: { useDefault: true },
      }),
    }
  );

  const evento = await eventRes.json();
  if (!eventRes.ok) throw new Error(evento?.error?.message ?? "Falha ao criar evento");
  return evento.id as string;
}
