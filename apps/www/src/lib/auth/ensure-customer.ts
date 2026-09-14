import type { createClient } from "@pakfactory/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Give the signed-in user a `customers` row — called right after every path on
 * this site that establishes a session (PROD-2512 / ADR-0016 D2).
 *
 * WHY HERE AND NOT AT SIGNUP. Customers and staff share one Supabase auth project.
 * The database used to create a customer row for every new `auth.users` entry and
 * skip `@dotdirect.ca`, which meant a staff member could never be a customer. The
 * decision is that one person may be both, and that each identity table is filled
 * by the site you signed in on: `customers` here, `internal_user` by a person in
 * admin. So this site creates the row the first time someone signs in to it.
 *
 * 🔴 The RPC takes NO ARGUMENTS on purpose, like `claim_rfqs_for_current_user`:
 * it inserts for `auth.uid()` only, so nothing on this side can name another user.
 * It is idempotent, so calling it on every sign-in is correct and cheap.
 *
 * Failure is logged and swallowed. The user IS signed in at this point, and no
 * account page reads `customers` yet (profile is mocked; requests scope on
 * `rfq.customer_id = auth.uid()`), so a missing row costs nothing visible.
 * Blocking the sign-in on it would trade a working session for a bookkeeping row.
 *
 * ⚠️ Deploy order: the function arrives in a pakfactory.com-server migration. If
 * this ships first, every call logs "function not found" until the migration is
 * applied — noisy, but harmless, and distinguished below so it is not mistaken for
 * a real failure.
 */
export async function ensureCustomer(
  supabase: ServerSupabase,
  context: string,
): Promise<void> {
  const { error } = await supabase.rpc("ensure_customer");
  if (!error) return;

  // PGRST202: PostgREST could not find the function in its schema cache.
  // 42883: Postgres "function does not exist". Both mean "migration not applied".
  const missing = error.code === "PGRST202" || error.code === "42883";
  console.error(
    missing
      ? `[${context}] ensure_customer is not deployed yet (apply the PROD-2512 migration)`
      : `[${context}] could not ensure customer row`,
    { code: error.code, message: error.message },
  );
}
