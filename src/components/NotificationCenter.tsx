"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, Check, ExternalLink, LoaderCircle } from "lucide-react";

type InternalNotification = { id: string; titulo: string; mensagem: string; href: string; criado_em: string; lido_em: string | null };
type PushSubscriptionValue = { endpoint: string; keys: { p256dh: string; auth: string } };

function toUint8Array(value: string) {
  const padded = value.padEnd(value.length + (4 - value.length % 4) % 4, "=").replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function NotificationCenter() {
  const [notificacoes, setNotificacoes] = useState<InternalNotification[]>([]);
  const [push, setPush] = useState({ configured: false, subscribed: false, publicKey: "" });
  const [loadingPush, setLoadingPush] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [notices, pushInfo] = await Promise.all([fetch("/api/notificacoes"), fetch("/api/notificacoes/push")]);
    if (notices.ok) { const body = await notices.json(); setNotificacoes(body.notifications ?? []); }
    if (pushInfo.ok) { const body = await pushInfo.json(); setPush({ configured: Boolean(body.configured), subscribed: Boolean(body.subscribed), publicKey: body.publicKey ?? "" }); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function markRead(id: string) {
    setNotificacoes((items) => items.map((item) => item.id === id ? { ...item, lido_em: new Date().toISOString() } : item));
    await fetch("/api/notificacoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }

  async function togglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setMessage("Este navegador não oferece notificações push."); return;
    }
    setLoadingPush(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      if (current && push.subscribed) {
        await current.unsubscribe();
        await fetch("/api/notificacoes/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(current.toJSON()) });
        setPush((value) => ({ ...value, subscribed: false }));
        setMessage("Notificações desativadas neste aparelho."); return;
      }
      if (Notification.permission === "denied") throw new Error("As notificações estão bloqueadas no navegador. Libere a permissão nas configurações do site.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permissão para notificações não concedida.");
      if (!push.publicKey) throw new Error("As notificações ainda não estão configuradas no servidor.");
      const subscription = current ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(push.publicKey) });
      const result = await fetch("/api/notificacoes/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON() as PushSubscriptionValue) });
      if (!result.ok) throw new Error("Não foi possível ativar as notificações.");
      setPush((value) => ({ ...value, subscribed: true })); setMessage("Notificações ativadas neste aparelho.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível alterar as notificações."); }
    finally { setLoadingPush(false); }
  }

  const unread = notificacoes.filter((item) => !item.lido_em);
  return <section className="mt-5 space-y-3">
    {unread.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950"><div className="flex items-center gap-2"><BellRing size={17} className="text-amber-dark" /><p className="text-sm font-bold">{unread.length} aviso{unread.length === 1 ? "" : "s"} novo{unread.length === 1 ? "" : "s"}</p></div><div className="mt-3 grid gap-2">{unread.map((notice) => <article key={notice.id} className="rounded-lg border border-amber-200 bg-white p-3"><p className="text-sm font-bold">{notice.titulo}</p><p className="mt-1 text-xs text-ink-muted">{notice.mensagem}</p><div className="mt-3 flex gap-2"><Link href={notice.href} onClick={() => void markRead(notice.id)} className="btn-secondary text-xs"><ExternalLink size={14} />Abrir OS</Link><button onClick={() => void markRead(notice.id)} className="btn-secondary text-xs"><Check size={14} />Marcar como lido</button></div></article>)}</div></div>}
    <div className="rounded-xl border border-base-border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Bell size={17} className="text-amber-dark" /><div><p className="text-sm font-bold">Notificações neste aparelho</p><p className="text-xs text-ink-muted">Receba uma mensagem quando uma nova OS for atribuída a você.</p></div></div>{push.configured && <button type="button" onClick={() => void togglePush()} disabled={loadingPush} className="btn-secondary shrink-0 text-xs">{loadingPush ? <LoaderCircle size={14} className="animate-spin" /> : <Bell size={14} />}{push.subscribed ? "Desativar" : "Ativar"}</button>}</div>{!push.configured && <p className="mt-2 text-xs text-ink-muted">As notificações push estão sendo configuradas.</p>}{message && <p className="mt-2 text-xs text-ink-muted">{message}</p>}</div>
  </section>;
}
