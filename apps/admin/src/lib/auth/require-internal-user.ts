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
  // TODO(PROD-2415): Backend — restore auth guardrail here:
  //   1. const user = await getUser(); redirect to /login if missing
  //   2. const account = await getInternalAccountAdapter().getByEmail(user.email)
  //   3. redirect /auth/sign-out?error=not_internal if not on allowlist
  // Until then, opt in with ADMIN_DEV_BYPASS=true (see dev-bypass.ts).
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
