import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const STATUS_ABERTOS = ["pendente", "aguardando_retorno", "reagendar"];

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [{ data: perfil }, { data: ordem }] = await Promise.all([
    s.from("profiles").select("papel").eq("id", user.id).maybeSingle(),
    s.from("ordens_servico")
      .select("id,status,tecnico_id")
      .eq("id", params.id)
      .maybeSingle(),
  ]);

  if (!ordem) {
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  }
  const admin = isAdminUser(user.email, perfil?.papel);
  if (!admin && ordem.tecnico_id !== user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (!STATUS_ABERTOS.includes(ordem.status)) {
    return NextResponse.json(
      { error: "Esta OS não está aguardando contato" },
      { status: 400 },
    );
  }

  let query = s
    .from("ordens_servico")
    .update({ status: "aguardando_retorno" })
    .eq("id", params.id);
  if (!admin) query = query.eq("tecnico_id", user.id);
  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
