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
