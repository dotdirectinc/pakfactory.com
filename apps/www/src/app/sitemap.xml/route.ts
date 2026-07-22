import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDY_SITEMAP_QUERY,
  type CaseStudySitemapEntry,
} from "@pakfactory/sanity/queries";
import { absoluteUrl } from "@/lib/site";
import { buildUrlset, type SitemapUrlEntry } from "@pakfactory/sitemap";

export const revalidate = 300;

// The local `buildSitemapXml` this replaced did **not** escape XML entities, so
// any `&`, `<` or quote in a slug or absolute URL emitted invalid XML that
// Search Console rejects (PROD-2179). `buildUrlset` escapes every value.
//
// Response headers are deliberately kept as-is rather than switching to the
// package's `xmlResponse`: this route uses `stale-while-revalidate=600`, which
// that helper does not emit. Escaping is the only intended behaviour change.

export async function GET() {
  const slugEntries = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudySitemapEntry[]>(CASE_STUDY_SITEMAP_QUERY)
        .catch(() => [] as CaseStudySitemapEntry[])
    : ([] as CaseStudySitemapEntry[]);

  const urls: SitemapUrlEntry[] = [
    {
      loc: absoluteUrl("/case-studies"),
      changefreq: "weekly",
      priority: 1,
    },
    ...slugEntries.map((entry) => ({
      loc: absoluteUrl(`/case-studies/${entry.slug}`),
      ...(entry.lastmod
        ? { lastmod: new Date(entry.lastmod).toISOString().split("T")[0] }
        : {}),
      changefreq: "monthly",
      priority: 0.8,
    })),
  ];

  return new Response(buildUrlset(urls), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
