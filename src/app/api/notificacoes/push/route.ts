import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

type SubscriptionInput = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function getSubscription(input: SubscriptionInput | null) {
  const endpoint = typeof input?.endpoint === "string" ? input.endpoint.trim() : "";
  const p256dh = typeof input?.keys?.p256dh === "string" ? input.keys.p256dh : "";
  const auth = typeof input?.keys?.auth === "string" ? input.keys.auth : "";
  if (!endpoint || !p256dh || !auth || endpoint.length > 2000 || p256dh.length > 500 || auth.length > 500) return null;
  try { new URL(endpoint); } catch { return null; }
  return { endpoint, p256dh, auth };
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return NextResponse.json({ configured: false, subscribed: false });
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true });
  return NextResponse.json({ configured: true, publicKey, subscribed: (count ?? 0) > 0 });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const subscription = getSubscription(await request.json().catch(() => null));
  if (!subscription) return NextResponse.json({ error: "Inscrição push inválida." }, { status: 400 });

  const { data: existing, error: findError } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: "Não foi possível salvar a inscrição." }, { status: 500 });

  const operation = existing
    ? supabase.from("push_subscriptions").update({ ...subscription, updated_at: new Date().toISOString() }).eq("id", existing.id)
    : supabase.from("push_subscriptions").insert({ ...subscription, user_id: user.id });
  const { error } = await operation;
  if (error) return NextResponse.json({ error: "Não foi possível salvar a inscrição." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const subscription = getSubscription(await request.json().catch(() => null));
  if (!subscription) return NextResponse.json({ error: "Inscrição push inválida." }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  if (error) return NextResponse.json({ error: "Não foi possível desativar as notificações." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
