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
  const { data: p } = await s
    .from("profiles")
    .select("papel")
    .eq("id", user.id)
    .single();
  if (!isAdminUser(user.email, p?.papel))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const body = await req.json();
  const update: any = {};
  if ("tecnico_id" in body) update.tecnico_id = body.tecnico_id;
  if (body.status === "cancelado") {
    update.status = "cancelado";
    update.cancelado_em = new Date().toISOString();
  }
  const { error } = await s
    .from("ordens_servico")
    .update(update)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
