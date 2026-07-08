import type { MetadataRoute } from "next";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDY_SITEMAP_QUERY,
  type CaseStudySitemapEntry,
} from "@pakfactory/sanity/queries";
import { absoluteUrl } from "@/lib/site";
import { MOCK_SLUGS } from "@/lib/mock/case-studies";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudySitemapEntry[]>(CASE_STUDY_SITEMAP_QUERY)
        .catch(() => [] as CaseStudySitemapEntry[])
    : ([] as CaseStudySitemapEntry[]);

  // Fall back to mock slugs until Sanity documents exist.
  const slugEntries =
    entries.length > 0
      ? entries
      : MOCK_SLUGS.map((slug) => ({ slug, lastmod: null }));

  const detailUrls: MetadataRoute.Sitemap = slugEntries.map((entry) => ({
    url: absoluteUrl(`/case-studies/${entry.slug}`),
    lastModified: entry.lastmod ? new Date(entry.lastmod) : new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: absoluteUrl("/case-studies"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...detailUrls,
  ];
}
