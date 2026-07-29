"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  LayoutDashboard,
  LogOut,
  ListChecks,
  Siren,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

const items = [
  {
    href: "/dashboard",
    label: "Visão geral",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/tecnicos", label: "Por técnico", icon: BarChart3 },
  { href: "/dashboard/pendencias", label: "Pendências", icon: Siren, adminOnly:true },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/finalizacao", label: "Finalização", icon: ListChecks, adminOnly:true },
  { href: "/dashboard/equipe", label: "Equipe", icon: UsersRound, adminOnly:true },
  { href: "/os/novo", label: "Nova OS", icon: ClipboardPlus, adminOnly:true },
];

export function DashboardShell({
  children,
  nome,
  papel,
}: {
  children: React.ReactNode;
  nome: string;
  papel: "admin" | "tecnico";
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(
    () => setCollapsed(localStorage.getItem("sidebar_collapsed") === "1"),
    [],
  );
  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }
  return (
    <div className="min-h-screen bg-base-bg lg:flex">
      <aside
        className={`flex border-b border-base-border bg-white px-3 py-3 transition-[width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:py-5 ${collapsed ? "lg:w-[76px]" : "lg:w-[250px]"}`}
      >
        <div className="flex min-w-0 flex-1 items-center justify-between lg:block">
          <div
            className={`flex items-center ${collapsed ? "lg:justify-center" : ""}`}
          >
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <span className="brand-mark">FE</span>
              {!collapsed && (
                <span className="hidden min-w-0 lg:block">
                  <b className="block truncate text-sm font-extrabold text-gray-900">
                    APP agendamento
                  </b>
                  <small className="font-mono text-[9px] uppercase tracking-[.16em] text-ink-muted">
                    Foco & Escudo
                  </small>
                </span>
              )}
            </Link>
          </div>
          <nav className="flex gap-1 lg:mt-9 lg:flex-col">
            <p
              className={`mb-1 px-3 font-mono text-[9px] uppercase tracking-[.18em] text-ink-muted ${collapsed ? "hidden" : "hidden lg:block"}`}
            >
              Operações
            </p>
            {items.filter(item=>papel==="admin"||!item.adminOnly).map(({ href, label, icon: Icon, exact }) => {
              const active = exact
                ? pathname === href
                : pathname.startsWith(href);
              return (
                <Link
                  title={collapsed ? label : undefined}
                  key={href}
                  className={`nav-link ${active ? "nav-link-active" : ""} ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
                  href={href}
                >
                  <Icon size={16} strokeWidth={1.9} />
                  {!collapsed && (
                    <span className="hidden lg:inline">{label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="hidden border-t border-base-border pt-3 lg:block">
          <div
            className={`mb-2 flex items-center gap-3 rounded-lg bg-base-surface2 p-2.5 ${collapsed ? "justify-center" : ""}`}
          >
            {papel === "admin" ? (
              <ShieldCheck size={18} className="shrink-0 text-amber-dark" />
            ) : (
              <UserRound size={18} className="shrink-0 text-amber-dark" />
            )}
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-gray-900">
                  {nome}
                </p>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                  {papel === "admin" ? "Administrador" : "Técnico"}
                </p>
              </div>
            )}
          </div>
          <LogoutButton
            icon={<LogOut size={16} strokeWidth={1.9} />}
            compact={collapsed}
          />
          <button
            onClick={toggle}
            className={`nav-link mt-1 w-full ${collapsed ? "justify-center px-2" : ""}`}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}{" "}
            {!collapsed && <span>Recolher menu</span>}
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-7 sm:px-7 lg:p-8 xl:p-10">
        {children}
      </main>
    </div>
  );
}
