import {
  breadcrumbList,
  jsonLdGraph,
  organization,
  serializeJsonLd,
  webPage,
  type BreadcrumbItem,
} from "@pakfactory/seo";
import { absoluteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";

/**
 * Canonical company origin for the Organization entity. The main site redirects
 * `www → apex`, and every other node (Person, breadcrumb, blog canonicals) uses
 * the apex host — so the Organization `url`/`@id` must too, or the graph mixes
 * hosts (PROD-2120). Strips a leading `www.` so it's correct regardless of how
 * `NEXT_PUBLIC_WWW_URL` is set.
 */
function canonicalOrgUrl(): string {
  return normalizeSiteUrl(getWwwUrl()).replace(/^(https?:\/\/)www\./i, "$1");
}

/**
 * Publisher Organization node for blog graphs.
 *
 * 🔴 `name` used to be the literal string "PakFactory". Editing Company name in
 * Global Settings changed nothing here, so the Studio field and the markup could
 * disagree with no way for an editor to notice — the second copy lived in source
 * code (PROD-3230). It now reads the editor's value when the caller has it.
 *
 * The literal survives only as a resilience fallback for when Global Settings
 * cannot be read (Sanity unreachable, project unconfigured) or when a caller has
 * no settings in scope. Dropping the Organization node on a transient fetch
 * failure would be worse than a stale but correct name, so this deliberately
 * does not use the newsroom's refuse-to-emit rule.
 */
export function pakfactoryOrganization(opts?: {
  logo?: string;
  name?: string | null;
}): {
  org: Record<string, unknown>;
  orgId: string;
} {
  const url = canonicalOrgUrl();
  const orgId = `${url}#organization`;
  return {
    orgId,
    org: organization({
      name: opts?.name?.trim() || "PakFactory",
      url,
      id: orgId,
      ...(opts?.logo ? { logo: opts.logo } : {}),
    }),
  };
}

/** BreadcrumbList with Blog home prepended to the trail. */
export function blogBreadcrumbList(
  trail: ReadonlyArray<BreadcrumbItem>,
): Record<string, unknown> {
  return breadcrumbList([
    { name: "Blog", url: absoluteUrl("/") },
    ...trail,
  ]);
}

/** jsonLdGraph + serializeJsonLd in one step. */
export function serializeBlogJsonLd(
  nodes: ReadonlyArray<Record<string, unknown>>,
): string {
  return serializeJsonLd(jsonLdGraph([...nodes]));
}

/**
 * WebPage + Blog-rooted breadcrumbs — used by contribute, privacy, landing, thank-you.
 * Pass `trail` (without the Blog home crumb) when the path needs more than one step
 * after Blog; otherwise defaults to Blog → crumbLabel/name.
 */
export function buildWebPageJsonLd(input: {
  name: string;
  url: string;
  description?: string;
  crumbLabel?: string;
  trail?: ReadonlyArray<BreadcrumbItem>;
}): string {
  const trail =
    input.trail ??
    [{ name: input.crumbLabel ?? input.name, url: input.url }];

  return serializeBlogJsonLd([
    webPage({
      name: input.name,
      url: input.url,
      description: input.description,
    }),
    blogBreadcrumbList(trail),
  ]);
}
