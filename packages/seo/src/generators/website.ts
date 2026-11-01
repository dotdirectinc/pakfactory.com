import type { WebSiteInput } from "../types";

/**
 * WebSite — the site itself as an entity, emitted on the home page only.
 *
 * What Google actually does with this is **site names**: the name shown above a
 * result instead of the bare domain. `name` and `url` are what that feature
 * reads, and `alternateName` is its fallback when the preferred name cannot be
 * used. Google supports one site name per domain or subdomain, so a second
 * WebSite node on an inner page is noise at best.
 *
 * 🔴 There is deliberately no `potentialAction` / SearchAction here. Google
 * retired the sitelinks search box in November 2024, so that markup now feeds
 * nothing — and ours would have had to point at `/api/search`, a JSON endpoint
 * no visitor can land on. Do not "complete" this generator by adding one.
 *
 * `publisher` is an `{ "@id" }` pointer at the Organization node in the same
 * @graph, never a second copy of it, so site and company resolve to one entity.
 */
export function website(input: WebSiteInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "WebSite",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.description) doc.description = input.description;
  if (input.publisher) doc.publisher = input.publisher;

  const aliases = (input.alternateName ?? [])
    .map((alias) => alias.trim())
    .filter(Boolean);
  if (aliases.length) doc.alternateName = aliases;

  return doc;
}
