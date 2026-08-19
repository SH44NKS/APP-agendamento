import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type AuthUser = {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
};

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Components não podem escrever cookies. O middleware
            // atualiza a sessão antes de renderizar as páginas protegidas.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // A remoção será aplicada pelo middleware ou por uma Route Handler.
          }
        },
      },
    }
  );
}

export async function getAuthUser(
  supabase: ReturnType<typeof createClient>,
): Promise<{ data: { user: AuthUser | null }; error: unknown }> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return { data: { user: null }, error };
  }

  const metadata = claims.user_metadata;

  return {
    data: {
      user: {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : undefined,
        user_metadata:
          metadata && typeof metadata === "object"
            ? (metadata as Record<string, unknown>)
            : {},
      },
    },
    error: null,
  };
}
