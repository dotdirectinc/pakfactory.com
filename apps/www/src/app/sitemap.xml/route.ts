import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDY_SITEMAP_QUERY,
  type CaseStudySitemapEntry,
} from "@pakfactory/sanity/queries";
import { absoluteUrl } from "@/lib/site";
import { listNewsSitemapEntries } from "@/lib/newsroom/newsroom";
import { WWW_ROUTES, newsItemHref } from "@/lib/www-routes";
import { buildUrlset, type SitemapUrlEntry } from "@pakfactory/sitemap";

export const revalidate = 300;

// The local `buildSitemapXml` this replaced did **not** escape XML entities, so
// any `&`, `<` or quote in a slug or absolute URL emitted invalid XML that
// Search Console rejects (PROD-2179). `buildUrlset` escapes every value.
//
// Response headers are deliberately kept as-is rather than switching to the
// package's `xmlResponse`: this route uses `stale-while-revalidate=600`, which
// that helper does not emit. Escaping is the only intended behaviour change.

function lastmodDate(value: string | null | undefined) {
  return value ? { lastmod: new Date(value).toISOString().split("T")[0] } : {};
}

export async function GET() {
  const newsEntries = await listNewsSitemapEntries();
  const slugEntries = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudySitemapEntry[]>(CASE_STUDY_SITEMAP_QUERY)
        .catch(() => [] as CaseStudySitemapEntry[])
    : ([] as CaseStudySitemapEntry[]);

  const urls: SitemapUrlEntry[] = [
    {
      loc: absoluteUrl("/case-studies"),
    },
    ...slugEntries.map((entry) => ({
      loc: absoluteUrl(`/case-studies/${entry.slug}`),
      ...(entry.lastmod
        ? { lastmod: new Date(entry.lastmod).toISOString().split("T")[0] }
        : {}),
    })),
    // Newsroom (PROD-2913 / PROD-2918) — published, past-release-time only.
    { loc: absoluteUrl(WWW_ROUTES.newsroom) },
    ...newsEntries.map((entry) => ({
      loc: absoluteUrl(newsItemHref(entry.slug)),
      ...lastmodDate(entry.lastmod),
    })),
  ];

  return new Response(buildUrlset(urls), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
