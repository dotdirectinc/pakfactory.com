import {
  breadcrumbList,
  jsonLdGraph,
  organization,
  serializeJsonLd,
  webPage,
  type BreadcrumbItem,
} from "@pakfactory/seo";
import { absoluteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";

/** Stable publisher Organization node for blog graphs. */
export function pakfactoryOrganization(opts?: { logo?: string }): {
  org: Record<string, unknown>;
  orgId: string;
} {
  const wwwUrl = normalizeSiteUrl(getWwwUrl());
  const orgId = `${wwwUrl}#organization`;
  return {
    orgId,
    org: organization({
      name: "PakFactory",
      url: wwwUrl,
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
