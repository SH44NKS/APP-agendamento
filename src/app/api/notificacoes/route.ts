import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data, error } = await supabase
    .from("notificacoes_internas")
    .select("id,titulo,mensagem,href,criado_em,lido_em")
    .order("criado_em", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "Não foi possível carregar os avisos." }, { status: 500 });

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "Aviso inválido." }, { status: 400 });

  const { error } = await supabase
    .from("notificacoes_internas")
    .update({ lido_em: new Date().toISOString() })
    .eq("id", id)
    .is("lido_em", null);
  if (error) return NextResponse.json({ error: "Não foi possível atualizar o aviso." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
