/**
 * Allowed hosts for the `bodyEmbed` inline iframe widget.
 *
 * Hybrid model: this baseline list ships in code (safe defaults), and admins can
 * add one-off hosts in the blog Settings singleton (`additionalEmbedHosts`)
 * without a redeploy. The blog renderer validates a URL against
 * `baseline ∪ settings.additionalEmbedHosts` before rendering an iframe — that is
 * the security boundary. The Studio schema duplicates this baseline for
 * authoring-time feedback (Studio does not depend on this package).
 *
 * Keep the Studio copy in `apps/studio/schemas/inline/body-embed.ts` aligned.
 */
export const EMBED_ALLOWED_HOSTS = [
  "zohopublic.com", // Zoho surveys / forms
  "docs.google.com", // Google Forms / Docs
  "lookerstudio.google.com", // Google (Looker Studio) dashboards
  "form.typeform.com", // Typeform
  "calendly.com", // Calendly scheduling
] as const;

/** Normalize a host: lowercase, trimmed, strip a leading `www.`. */
function normalizeHost(host: string): string {
  return host.toLowerCase().trim().replace(/^www\./, "");
}

/**
 * True when `url` is an `https:` URL whose host equals (or is a subdomain of) an
 * allowed host. `additionalHosts` are the admin-managed hosts from settings.
 */
export function isAllowedEmbedUrl(
  url: string | undefined | null,
  additionalHosts: readonly string[] = [],
): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;

  const host = normalizeHost(parsed.hostname);
  const allowed = [
    ...EMBED_ALLOWED_HOSTS,
    ...additionalHosts.map(normalizeHost).filter(Boolean),
  ];
  return allowed.some((h) => host === h || host.endsWith(`.${h}`));
}
