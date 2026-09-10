import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * Session helpers for route gating (PROD-1426 / PROD-2412).
 *
 * getUser(), never getSession(): getSession trusts the cookie as it arrives,
 * getUser revalidates it against the auth server.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Gate a protected route. Sends unauthenticated visitors to login with a return URL. */
export async function requireUser(
  returnTo: string,
  loginPath = "/login",
): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect(`${loginPath}?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

export function accountDisplayName(user: User): string {
  const metadata = user.user_metadata as {
    full_name?: unknown;
    name?: unknown;
  } | null;

  const fromMetadata = [metadata?.full_name, metadata?.name].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  if (fromMetadata) return fromMetadata.trim();

  const localPart = user.email?.split("@")[0] ?? "";
  return localPart.replace(/[._-]+/g, " ").trim();
}

export function accountAvatarUrl(user: User): string | undefined {
  const metadata = user.user_metadata as {
    avatar_url?: unknown;
    picture?: unknown;
  } | null;

  return [metadata?.avatar_url, metadata?.picture].find(
    (value): value is string =>
      typeof value === "string" && value.startsWith("https://"),
  );
}

/** A relative, single-slash path or nothing. Rejects open redirects. */
export function safeNext(
  value: string | undefined,
  fallback = "/account",
): string {
  if (!value) return fallback;
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

/** What a signed-in buyer's account can contribute to a form. */
export type AccountIdentity = {
  email: string;
  firstName: string;
  lastName: string;
  /** `google`, `email`, … — from app_metadata, which the user cannot edit. */
  provider: string;
};

/**
 * Split a display name into first / last.
 *
 * FIRST TOKEN, then everything else — so "Mary Jane Watson" gives
 * "Mary" + "Jane Watson" rather than dropping a name part. A single-token name
 * yields an empty last name, which the form then asks for; guessing a surname
 * is worse than leaving a required field visibly empty.
 */
function splitName(full: string): { firstName: string; lastName: string } {
  const [first = "", ...rest] = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: first, lastName: rest.join(" ") };
}

/**
 * What we can prefill from the account, and nothing more.
 *
 * 🔴 There is NO `given_name` / `family_name` to read. Verified against the
 * staging auth schema 2026-09-10: Google identities here carry only
 * `full_name` / `name` (plus avatar, iss, sub, …), so the first/last split has
 * to come from splitting the display name. Reading `given_name` would look
 * correct and silently return undefined for every user.
 *
 * The provider difference is data, not policy: `signUp({ email, password })`
 * stores no metadata at all, so an email/password account normally has only an
 * address. This returns whatever the account actually holds rather than
 * branching on provider — which produces "name + email for Google, email only
 * for email/password" without hard-coding a rule that goes stale the day we
 * start collecting a name at sign-up.
 */
export function accountIdentity(user: User): AccountIdentity {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;

  const displayName = [metadata.full_name, metadata.name].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return {
    email: user.email ?? "",
    ...splitName(displayName ?? ""),
    provider:
      typeof appMetadata.provider === "string" ? appMetadata.provider : "email",
  };
}
