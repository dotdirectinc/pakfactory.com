import { redirect } from "next/navigation";
import type { InternalAccount } from "@pakfactory/domain/internal-account";
import type { User } from "@supabase/supabase-js";
import { getUser } from "@pakfactory/supabase/session";
import { getInternalAccountAdapter } from "@/lib/adapters";
import {
  getDevBypassSession,
  isAdminDevBypassEnabled,
} from "@/lib/auth/dev-bypass";

export type InternalSession = {
  user: User;
  account: InternalAccount;
};

export async function requireInternalUser(
  returnTo: string,
): Promise<InternalSession> {
  if (isAdminDevBypassEnabled()) {
    return getDevBypassSession();
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
