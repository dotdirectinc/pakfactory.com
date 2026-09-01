import { redirect } from "next/navigation";
import type { InternalAccount } from "@pakfactory/domain/internal-account";
import type { User } from "@supabase/supabase-js";
import { getUser } from "@pakfactory/supabase/session";
import { getInternalAccountAdapter } from "@/lib/adapters";
import {
  getDevBypassSession,
  isAdminDevBypassEnabled,
} from "@/lib/auth/dev-bypass";
import { isSupabaseConfigured } from "@/lib/auth/supabase-configured";

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

  const user = await getUser();
  if (!user?.email) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const account = await getInternalAccountAdapter().getByEmail(user.email);
  if (!account) {
    redirect("/auth/sign-out?error=not_internal");
  }

  return { user, account };
}
