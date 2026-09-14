/**
 * Outbound origins for Sanity content hits (ADR-018 content corpus).
 * Server-only — not used for buyer auth deep-links.
 */
function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim().replace(/\/$/, "") : "";
}

export function getAdminWwwOrigin(): string {
  return (
    readEnv("ADMIN_WWW_ORIGIN") ||
    readEnv("NEXT_PUBLIC_WWW_URL") ||
    "https://www.pakfactory.com"
  );
}

export function getAdminBlogOrigin(): string {
  const blog = readEnv("ADMIN_BLOG_ORIGIN");
  if (blog) return blog;
  const base = readEnv("NEXT_PUBLIC_SITE_URL");
  const path = readEnv("NEXT_PUBLIC_BLOG_BASE_PATH");
  if (base) return `${base.replace(/\/$/, "")}${path || ""}`;
  return "https://www.pakfactory.com/blog";
}

export function wwwPath(path: string): string {
  const origin = getAdminWwwOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}

export function blogPostHref(slug: string): string {
  const origin = getAdminBlogOrigin();
  return `${origin}/${slug}`;
}
