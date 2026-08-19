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
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
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
