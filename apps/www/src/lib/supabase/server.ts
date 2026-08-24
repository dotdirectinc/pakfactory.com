import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * `cookies()` is async in Next 16, so this is too.
 *
 * The setAll writes are wrapped: a Server Component cannot set cookies, and
 * @supabase/ssr calls setAll during a token refresh regardless. Throwing there
 * would break rendering for a refresh the proxy has already performed on this
 * request, so the failure is swallowed — this is the documented pattern, not
 * laziness. It is only safe BECAUSE the proxy refreshes the session; without
 * that, sessions would expire and never renew.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component render — the proxy already refreshed the session.
          }
        },
      },
    },
  );
}
