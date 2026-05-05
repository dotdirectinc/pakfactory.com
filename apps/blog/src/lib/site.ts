/**
 * Public site origin for the blog app (JSON-LD, canonical URLs).
 * Set `NEXT_PUBLIC_SITE_URL` in repo root `.env.local` (e.g. `https://blog.example.com`).
 */
function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Default matches local `pnpm dev:blog` (port 3001). */
const DEFAULT_SITE_URL = "http://localhost:3001";

export function getSiteUrl(): string {
  return readEnv("NEXT_PUBLIC_SITE_URL") || DEFAULT_SITE_URL;
}

export function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
