"use client";
import { createClient } from "@/lib/supabase/client";
export function LogoutButton({
  icon,
  compact = false,
}: {
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      title={compact ? "Sair" : undefined}
      className={`nav-link w-full text-left ${compact ? "justify-center px-2" : ""}`}
      onClick={async () => {
        await createClient().auth.signOut();
        location.href = "/login";
      }}
    >
      {icon}
      {!compact && <span>Sair</span>}
    </button>
  );
}
