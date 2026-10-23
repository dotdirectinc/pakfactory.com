import { cache } from "react";
import { redirect } from "next/navigation";
import type { InternalAccount } from "@pakfactory/request/internal-account";
import type { User } from "@supabase/supabase-js";
import { getUser } from "@pakfactory/supabase/session";
import { getInternalAccountAdapter } from "@/lib/adapters";
import {
  getDevBypassSession,
  isAdminDevBypassEnabled,
} from "@/lib/auth/dev-bypass";
import { isInternalEmail } from "@/lib/auth/internal-domain";
import { isSupabaseConfigured } from "@/lib/auth/supabase-configured";
import { startTiming } from "@/lib/perf/timing";

export type InternalSession = {
  user: User;
  account: InternalAccount;
};

export async function requireInternalUser(
  returnTo: string,
): Promise<InternalSession> {
  // The guardrail below is live: session → internal account → refuse if absent.
  // With ADMIN_DATA_SOURCE=supabase the account comes from `public.internal_user`
  // under RLS (PROD-2415); with `mock` it comes from the allowlist env var.
  //
  // ⚠️ ADMIN_DEV_BYPASS short-circuits ALL of it and returns a fabricated
  // session. Local only — see dev-bypass.ts.
  if (isAdminDevBypassEnabled()) {
    return getDevBypassSession();
  }

  if (!isSupabaseConfigured()) {
    redirect("/login?error=supabase_not_configured");
  }

  const { user, account } = await loadSession();
  if (!user?.email) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!account) {
    redirect("/auth/sign-out?error=not_internal");
  }

  return { user, account };
}

/**
 * The session and the internal account, read once per request (PROD-3116): the layout and the page both
 * ask, and each ask was a Supabase Auth round trip plus a database lookup. The redirect decisions stay in
 * `requireInternalUser`, so each caller still sends people to its own return URL.
 */
const loadSession = cache(async (): Promise<{ user: User | null; account: InternalAccount | null }> => {
  const t = startTiming("requireInternalUser");
  const user = await t.step("getUser", getUser());
  // The domain is re-checked here, not only at sign-in, so a session that predates the
  // rule (or slipped past it) is refused on its next request (internal-domain.ts).
  const account = isInternalEmail(user?.email)
    ? await t.step("account", getInternalAccountAdapter().getByEmail(user!.email!))
    : null;
  t.done();
  return { user, account };
});
