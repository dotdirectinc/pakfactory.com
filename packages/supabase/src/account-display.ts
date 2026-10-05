import type { User } from "@supabase/supabase-js";

/**
 * Pure account-display helpers. No server imports, so Client Components can
 * use them (the www header resolves the account in the browser so `(site)`
 * pages stay cacheable — PROD-2754). Re-exported from `./session`.
 */

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
