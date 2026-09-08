import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 🔴 NO cookie `domain` is set, and that is what keeps the admin and customer
 * apps signed in separately.
 *
 * Both apps import this one client, so both use the same cookie NAME. Cookies
 * are scoped by host and ignore the port, so:
 *
 *   staging.pakfactory.com  vs  staging.admin.pakfactory.com   → isolated ✅
 *   localhost:3003          vs  localhost:4000                 → SHARED ⚠️
 *
 * Verified on staging 2026-09-04: different accounts on each, and signing out of
 * one leaves the other signed in. The local collision is a development artifact
 * only — it is why signing in to admin can appear to sign you in to www on a dev
 * machine, and it is not worth renaming the cookie for, because that would sign
 * every deployed user out to fix something no deployed user experiences.
 *
 * ⚠️ Adding `cookieOptions: { domain: ".pakfactory.com" }` — the obvious way to
 * get one sign-in across subdomains — immediately merges the two sessions in
 * PRODUCTION, so a staff member signing in to admin becomes signed in to the
 * buyer site as the same identity, and signing out of either kills both. If
 * cross-subdomain SSO is ever wanted, it needs deciding on purpose, with the
 * customer/staff split (2026-09-04) reconsidered at the same time.
 */
/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * `cookies()` is async in Next 16, so this is too.
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
