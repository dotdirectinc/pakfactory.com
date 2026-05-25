import { BLOG_BASE_PATH } from "@/lib/base-path";

/**
 * Public site origin for the blog app (JSON-LD, canonical URLs).
 * Must include `basePath` — set `NEXT_PUBLIC_SITE_URL` in repo root `.env.local`
 * (e.g. `https://pakfactory.com/blog` or `http://localhost:3003/blog`).
 */
function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function defaultLocalOrigin(): string {
  const port = process.env.PORT?.trim() || "3003";
  return `http://localhost:${port}${BLOG_BASE_PATH}`;
}

/** Default matches local `pnpm dev:blog` with `basePath` `/blog`. */
const DEFAULT_SITE_URL = defaultLocalOrigin();

export function getSiteUrl(): string {
  return readEnv("NEXT_PUBLIC_SITE_URL") || DEFAULT_SITE_URL;
}

export function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
