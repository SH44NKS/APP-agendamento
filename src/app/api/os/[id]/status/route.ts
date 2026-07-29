import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await req.json();
  const { data: perfil } = await s
    .from("profiles")
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();
  const admin = isAdminUser(user.email, perfil?.papel);
  const motivos = [
    "cliente_ausente",
    "veiculo_indisponivel",
    "endereco_incorreto",
    "falta_equipamento",
    "cliente_solicitou",
    "problema_tecnico",
    "outro",
  ];
  if (body.status === "aguardando_retorno") {
    let query = s
      .from("ordens_servico")
      .update({ status: "aguardando_retorno" })
      .eq("id", params.id)
      .eq("status", "pendente");
    if (!admin) query = query.eq("tecnico_id", user.id);
    const { error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (body.status === "finalizado") {
    if (!admin)
      return NextResponse.json(
        { error: "Somente administradores podem finalizar" },
        { status: 403 },
      );
    const { error } = await s
      .from("ordens_servico")
      .update({
        status: "finalizado",
        finalizado_em: new Date().toISOString(),
        concluido_em: new Date().toISOString(),
      })
      .eq("id", params.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (body.status === "reagendar") {
    if (!motivos.includes(body.motivo))
      return NextResponse.json({ error: "Selecione um motivo" }, { status: 400 });
    let query = s
      .from("ordens_servico")
      .update({
        status: "reagendar",
        data_hora_agendada: null,
        concluido_tecnico_em: null,
        motivo_ocorrencia: body.motivo,
        detalhe_ocorrencia: String(body.detalhe ?? "").trim() || null,
        ocorrencia_em: new Date().toISOString(),
        ocorrencia_por: user.id,
      });
    query = query.eq("id", params.id);
    if (!admin) query = query.eq("tecnico_id", user.id);
    const { error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (body.status === "cancelado") {
    if (!admin)
      return NextResponse.json({ error: "Somente administradores podem cancelar" }, { status: 403 });
    if (!motivos.includes(body.motivo))
      return NextResponse.json({ error: "Selecione um motivo" }, { status: 400 });
    const { error } = await s.from("ordens_servico").update({
      status: "cancelado",
      motivo_ocorrencia: body.motivo,
      detalhe_ocorrencia: String(body.detalhe ?? "").trim() || null,
      ocorrencia_em: new Date().toISOString(),
      ocorrencia_por: user.id,
    }).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Status inválido" }, { status: 400 });
}
