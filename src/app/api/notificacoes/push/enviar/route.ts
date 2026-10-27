import { NextResponse } from "next/server";
import webpush from "web-push";
import { isAdminUser } from "@/lib/auth";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

function configured() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("papel").eq("id", user.id).maybeSingle();
  if (!isAdminUser(user.email, profile?.papel)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const osId = typeof body?.osId === "string" ? body.osId : "";
  if (!osId) return NextResponse.json({ error: "OS inválida." }, { status: 400 });

  const { data: os, error: osError } = await supabase
    .from("ordens_servico")
    .select("id,tecnico_id,cliente_nome,veiculo_identificador,tipo")
    .eq("id", osId)
    .maybeSingle();
  if (osError || !os?.tecnico_id) return NextResponse.json({ error: "OS não encontrada." }, { status: 404 });

  const tipo = os.tipo === "instalacao" ? "Instalação" : os.tipo === "retirada" ? "Retirada" : "Manutenção";
  const title = "Nova OS atribuída a você";
  const message = `${tipo}: ${os.cliente_nome} · ${os.veiculo_identificador}`.slice(0, 500);
  const href = `/os/${os.id}`;

  const { error: noticeError } = await supabase.from("notificacoes_internas").insert({
    user_id: os.tecnico_id, os_id: os.id, titulo: title, mensagem: message, href,
  });
  if (noticeError) return NextResponse.json({ error: "Não foi possível criar o aviso interno." }, { status: 500 });

  if (!configured()) return NextResponse.json({ ok: true, pushConfigured: false });

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", os.tecnico_id);
  const payload = JSON.stringify({ title, body: message, url: href, icon: "/app-icon.png" });
  const results = await Promise.all((subscriptions ?? []).map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
      return { id: subscription.id, expired: false };
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      return { id: subscription.id, expired: statusCode === 404 || statusCode === 410 };
    }
  }));
  const expired = results.filter((result) => result.expired).map((result) => result.id);
  if (expired.length) await supabase.from("push_subscriptions").delete().in("id", expired);

  return NextResponse.json({ ok: true, pushConfigured: true, sent: results.length - expired.length });
}
