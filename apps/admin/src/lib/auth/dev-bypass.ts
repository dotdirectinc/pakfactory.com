/**
 * Local development auth bypass and mock session.
 *
 * Backend (PROD-2415): restore the real guardrail in
 * `require-internal-user.ts` — Supabase session + internal-account check.
 * Remove bypass usage once that ships.
 */

import type { User } from "@supabase/supabase-js";
import type { InternalAccount } from "@pakfactory/domain/internal-account";

const DEFAULT_DEV_BYPASS_ZOHO_USER_ID = "zoho-user-sales-1";

export function isAdminDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ADMIN_DEV_BYPASS === "true" &&
    process.env.VERCEL_ENV !== "production"
  );
}

export function getDevBypassSession(): {
  user: User;
  account: InternalAccount;
} {
  const zohoUserId =
    process.env.ADMIN_DEV_BYPASS_ZOHO_USER_ID?.trim() ||
    DEFAULT_DEV_BYPASS_ZOHO_USER_ID;

  const user = {
    id: "dev-bypass",
    email: "dev-bypass@localhost",
    user_metadata: {},
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as User;

  return {
    user,
    account: { role: "sales", zohoUserId },
  };
}
