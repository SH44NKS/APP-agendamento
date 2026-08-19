import { DashboardShell } from "@/components/DashboardShell";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = createClient();
  const {
    data: { user },
  } = await getAuthUser(s);
  const { data: perfil } = await s
    .from("profiles")
    .select("nome,papel")
    .eq("id", user?.id)
    .maybeSingle();
  const admin = isAdminUser(user?.email, perfil?.papel);
  const nome =
    perfil?.nome ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuário";
  return (
    <DashboardShell nome={nome} papel={admin ? "admin" : "tecnico"}>
      {children}
    </DashboardShell>
  );
}
