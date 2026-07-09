import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDY_SITEMAP_QUERY,
  type CaseStudySitemapEntry,
} from "@pakfactory/sanity/queries";
import { absoluteUrl } from "@/lib/site";
import { MOCK_SLUGS } from "@/lib/mock/case-studies";

export const revalidate = 300;

function buildSitemapXml(
  urls: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[],
): string {
  const items = urls
    .map(
      ({ loc, lastmod, changefreq, priority }) =>
        [
          `  <url>`,
          `    <loc>${loc}</loc>`,
          lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
          changefreq ? `    <changefreq>${changefreq}</changefreq>` : "",
          priority ? `    <priority>${priority}</priority>` : "",
          `  </url>`,
        ]
          .filter(Boolean)
          .join("\n"),
    )
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    items,
    `</urlset>`,
  ].join("\n");
}

export async function GET() {
  const entries = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudySitemapEntry[]>(CASE_STUDY_SITEMAP_QUERY)
        .catch(() => [] as CaseStudySitemapEntry[])
    : ([] as CaseStudySitemapEntry[]);

  const slugEntries =
    entries.length > 0
      ? entries
      : MOCK_SLUGS.map((slug) => ({ slug, lastmod: null }));

  const urls = [
    {
      loc: absoluteUrl("/case-studies"),
      changefreq: "weekly",
      priority: "1.0",
    },
    ...slugEntries.map((entry) => ({
      loc: absoluteUrl(`/case-studies/${entry.slug}`),
      lastmod: entry.lastmod
        ? new Date(entry.lastmod).toISOString().split("T")[0]
        : undefined,
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];

  return new Response(buildSitemapXml(urls), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
