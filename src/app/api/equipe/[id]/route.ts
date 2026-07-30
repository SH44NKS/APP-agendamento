import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";

const MASTER = "alissons.silva25@gmail.com";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: ator } = await s.from("profiles").select("papel").eq("id", user.id).single();
  if (!isAdminUser(user.email, ator?.papel)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { data: alvo } = await s.from("profiles").select("email").eq("id", params.id).single();
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.nome === "string") {
    const nome = body.nome.trim().replace(/\s+/g, " ");
    if (nome.length < 2 || nome.length > 80) return NextResponse.json({ error: "O nome deve ter entre 2 e 80 caracteres" }, { status: 400 });
    update.nome = nome;
  }
  if (alvo.email.toLowerCase() === MASTER && (body.papel !== undefined || body.ativo !== undefined)) {
    return NextResponse.json({ error: "O papel e o acesso do administrador mestre não podem ser alterados" }, { status: 400 });
  }
  if (body.papel === "admin" || body.papel === "tecnico") update.papel = body.papel;
  if (typeof body.ativo === "boolean") update.ativo = body.ativo;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nenhuma alteração válida" }, { status: 400 });
  const { error } = await s.from("profiles").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
