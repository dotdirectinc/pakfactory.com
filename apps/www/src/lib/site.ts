/**
 * www site origin helper — mirrors the pattern from apps/blog/src/lib/site.ts.
 * NEXT_PUBLIC_SITE_URL must be the origin only (scheme + host, no path).
 * Falls back to https://pakfactory.com so production is safe even if the var is unset.
 */
function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

export function getSiteUrl(): string {
  return readEnv("NEXT_PUBLIC_SITE_URL") || "https://pakfactory.com";
}

/** Build an absolute URL from a root-relative path. */
export function absoluteUrl(path: string): string {
  const origin = getSiteUrl().replace(/\/+$/, "");
  return `${origin}${path}`;
}

/**
 * Always returns the canonical pakfactory.com origin for outbound links
 * (nav, footer, CTAs). Separate from getSiteUrl() so preview deployments
 * don't point footer/nav links at the preview URL.
 */
export function getWwwUrl(): string {
  return readEnv("NEXT_PUBLIC_WWW_URL") || "https://pakfactory.com";
}
