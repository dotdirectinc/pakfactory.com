import { BLOG_SITEMAP_TAGS_CANDIDATES_QUERY } from "@pakfactory/sanity/queries";
import { tagHref } from "@/lib/blog-post-url";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { isSanityConfigured } from "@/lib/sanity/env";
import { getTagListingRobots } from "@/lib/seo";
import {
  buildUrlset,
  SITEMAP_GROUP_SIZE,
  xmlResponse,
  type SitemapUrlEntry,
} from "@pakfactory/sitemap";

export const revalidate = 60;

type TopicCandidate = {
  slug: string;
  allowIndex?: boolean | null;
  postCount: number;
};

/**
 * Topic sitemap (PROD-2195).
 *
 * Inclusion is decided by **`getTagListingRobots()`** — the same function the
 * topic page uses to emit its `<meta name="robots">`. Previously the query
 * filtered on `allowIndex` alone while the page *also* applied
 * `autoNoindexThreshold` (forcing `noindex` below N published posts). The two
 * drifted, and 27 of the 36 listed topics were serving `noindex` — a sitemap
 * asking Google to crawl pages it had been told not to index.
 *
 * The rule is deliberately **not** reimplemented as a GROQ predicate: it already
 * lived in two places and drifted once, so a third copy in another language
 * would guarantee it happens again. The query supplies the inputs; this route
 * applies the decision.
 *
 * Consequence: filtering happens in TS, so candidates are fetched unsliced and
 * paginated here. Fine at today's ~50 topics — see the guard below.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page: pageStr } = await params;
  // Canonical form is `/topics-sitemap/{n}.xml`; the bare `/topics-sitemap/{n}`
  // (no extension) is still accepted so previously-submitted URLs don't 404.
  const digits = /^(\d+)(?:\.xml)?$/.exec(pageStr)?.[1];
  const page = digits ? parseInt(digits, 10) : NaN;
  if (isNaN(page) || page < 1) {
    return new Response("Not found", { status: 404 });
  }

  const entries: SitemapUrlEntry[] = [];

  if (isSanityConfigured()) {
    const [settings, candidates] = await Promise.all([
      fetchBlogSettings(),
      getPublishedSanityClient()
        .fetch<TopicCandidate[]>(
          BLOG_SITEMAP_TAGS_CANDIDATES_QUERY,
          blogLanguageParams(),
        )
        .catch(() => [] as TopicCandidate[]),
    ]);

    if (candidates.length >= 5000) {
      // Slicing happens in-process, so the whole candidate set is held in
      // memory. Harmless at today's scale; revisit if this ever fires.
      console.warn(
        `[topics-sitemap] ${candidates.length} topic candidates fetched unsliced`,
      );
    }

    const autoNoindexThreshold = settings?.tagDefaults?.autoNoindexThreshold;

    // Page 1 of the archive with no filter params — the canonical URL a sitemap
    // should advertise, and the one whose robots directive must agree.
    const indexable = candidates.filter(
      (topic) =>
        getTagListingRobots(
          1,
          {},
          topic.postCount > 0,
          // GROQ returns null for an unset boolean; the directive helper treats
          // anything that isn't exactly `true` as "not opted in", so both null
          // and undefined collapse to the same (correct) answer.
          { allowIndex: topic.allowIndex ?? undefined },
          { postCount: topic.postCount, autoNoindexThreshold },
        ).index,
    );

    const start = (page - 1) * SITEMAP_GROUP_SIZE;
    const pageTopics = indexable.slice(start, start + SITEMAP_GROUP_SIZE);

    if (pageTopics.length === 0 && page > 1) {
      return new Response("Not found", { status: 404 });
    }

    for (const topic of pageTopics) {
      entries.push({ loc: absoluteUrl(tagHref(topic.slug)) });
    }
  }

  return xmlResponse(buildUrlset(entries, sitemapXslUrl()), 60);
}
