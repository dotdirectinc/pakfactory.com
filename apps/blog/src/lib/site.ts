/**
 * Public site origin for the blog app (JSON-LD, canonical URLs).
 * Set `NEXT_PUBLIC_SITE_URL` in repo root `.env.local`
 * (e.g. `https://blog.pakfactory.com` or `http://localhost:3003`).
 */
function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function defaultLocalOrigin(): string {
  const port = process.env.PORT?.trim() || "3003";
  return `http://localhost:${port}`;
}

/** Default matches local `pnpm dev:blog` (blog app at deployment root). */
const DEFAULT_SITE_URL = defaultLocalOrigin();

export function getSiteUrl(): string {
  return readEnv("NEXT_PUBLIC_SITE_URL") || DEFAULT_SITE_URL;
}

/** Main marketing site origin (organization entity, industry links). */
export function getWwwUrl(): string {
  return readEnv("NEXT_PUBLIC_WWW_URL") || "https://www.pakfactory.com";
}

export function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
