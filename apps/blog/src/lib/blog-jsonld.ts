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

/** Stable publisher Organization node for blog graphs. */
export function pakfactoryOrganization(opts?: { logo?: string }): {
  org: Record<string, unknown>;
  orgId: string;
} {
  const url = canonicalOrgUrl();
  const orgId = `${url}#organization`;
  return {
    orgId,
    org: organization({
      name: "PakFactory",
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
