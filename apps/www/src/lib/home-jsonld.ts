import { jsonLdGraph, serializeJsonLd, website } from "@pakfactory/seo";

import { companyOrganizationNode } from "@/lib/organization-node";
import { getSiteUrl } from "@/lib/site";
import type { CompanyRecord } from "@/lib/www-global-settings";

/**
 * Home-page JSON-LD: the company, and the site as an entity.
 *
 * `WebSite` belongs on the home page and nowhere else — Google supports one
 * site name per domain, so repeating the node on inner pages adds nothing.
 *
 * Until now `/` emitted no JSON-LD at all, so this is also the first page to
 * state the Organization outside a product, expertise, blog or case-study
 * context (PROD-2990 §6).
 *
 * 🔴 No SearchAction. Google retired the sitelinks search box in November 2024,
 * and www has no search results page to point one at — only `/api/search`,
 * which returns JSON to the type-ahead and is not a page a visitor can reach.
 * See the note on the `website()` generator before adding one.
 */
export function buildHomePageJsonLd(company: CompanyRecord | null): string {
  const origin = getSiteUrl().replace(/\/+$/, "");
  const publisher = companyOrganizationNode(company);
  const nodes: Record<string, unknown>[] = [];

  if (publisher) nodes.push(publisher.org);

  // The site's name comes from the same Global Settings field as the
  // company's, so Google cannot be told two different names for one brand.
  const siteName = company?.name?.trim();
  if (siteName) {
    nodes.push(
      website({
        id: `${origin}#website`,
        name: siteName,
        url: origin,
        ...(publisher ? { publisher: { "@id": publisher.orgId } } : {}),
      }),
    );
  }

  return serializeJsonLd(jsonLdGraph(nodes));
}
