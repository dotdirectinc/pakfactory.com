import type { InternalAccountAdapter } from "@pakfactory/domain/adapters/internal-account";
import type { InternalAccount } from "@pakfactory/domain/internal-account";
import { createClient } from "@pakfactory/supabase/server";

/**
 * PROD-2415: read the internal role + Zoho user id from Supabase, never from
 * `user_metadata`.
 *
 * 🔴 Uses the SESSION-scoped client (anon key + the caller's cookies), not the
 * service role. `internal_user` carries an RLS policy of `id = auth.uid()`, so
 * the database — not this query — is what stops one staff member reading
 * another's row. A service-role client would bypass RLS entirely and make the
 * policy decorative.
 *
 * The practical consequence: this returns a row only for the SIGNED-IN user.
 * `requireInternalUser` calls it with `user.email` from the session, which is
 * exactly that case; any other address correctly yields null.
 */
export function createSupabaseInternalAccountAdapter(): InternalAccountAdapter {
  return {
    async getByEmail(email: string): Promise<InternalAccount | null> {
      const normalised = email.trim().toLowerCase();
      if (!normalised) return null;

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("internal_user")
        .select("role, crm_owner_id, disabled_at")
        .eq("email", normalised)
        .maybeSingle();

      if (error) {
        // Not "no account" — we could not tell. Throwing sends the caller to the
        // sign-out path with an error rather than silently treating an outage as
        // "you are not staff", which would look like revoked access.
        throw new Error(`internal account lookup failed: ${error.message}`);
      }
      if (!data) return null;

      // Revocation is `disabled_at`, not deletion, so the row survives for audit
      // (see docs/internal-accounts.md). RLS does not filter on it — the policy
      // scoping REQUESTS does — so the check belongs here too.
      if (data.disabled_at) return null;

      // An account with no Zoho mapping cannot be scoped to anything: every
      // request lookup would return nothing. Refusing here produces a clear
      // "not internal" redirect instead of an empty dashboard that looks broken.
      if (!data.crm_owner_id) return null;

      return {
        role: data.role as InternalAccount["role"],
        zohoUserId: data.crm_owner_id as string,
      };
    },
  };
}
