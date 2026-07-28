import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
const MASTER = "alissons.silva25@gmail.com";
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: ator } = await s
    .from("profiles")
    .select("papel")
    .eq("id", user.id)
    .single();
  if (!isAdminUser(user.email, ator?.papel))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { data: alvo } = await s
    .from("profiles")
    .select("email")
    .eq("id", params.id)
    .single();
  if (!alvo)
    return NextResponse.json(
      { error: "Usuário não encontrado" },
      { status: 404 },
    );
  if (alvo.email.toLowerCase() === MASTER)
    return NextResponse.json(
      { error: "O administrador mestre não pode ser alterado" },
      { status: 400 },
    );
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.papel === "admin" || body.papel === "tecnico")
    update.papel = body.papel;
  if (typeof body.ativo === "boolean") update.ativo = body.ativo;
  const { error } = await s.from("profiles").update(update).eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
