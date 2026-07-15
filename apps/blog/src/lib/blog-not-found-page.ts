import type { Metadata } from "next";
import type { BlogNotFoundContent } from "@/lib/blog-data";
import { buildDocMetadata } from "@/lib/resolve-seo";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import {
  getBlogRobotsDirective,
  type BlogRobotsDirective,
} from "@/lib/seo";

const NOT_FOUND_TITLE_FALLBACK = "Page not found";
const NOT_FOUND_META_TITLE_FALLBACK = "Page not found | PakFactory Blog";
const NOT_FOUND_DESCRIPTION_FALLBACK =
  "This page does not exist. Explore topics or head back to the blog home.";

/** 404 is always noindex; CMS SEO + pageDefaults only fill title/description. */
export function getNotFoundRobots(): BlogRobotsDirective {
  return getBlogRobotsDirective({ kind: "error" });
}

export async function buildBlogNotFoundMetadata(
  page: BlogNotFoundContent | null,
): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "pageDefaults");
  const pageTitle = page?.title?.trim() || NOT_FOUND_TITLE_FALLBACK;
  const {
    topics: _topics,
    blocks: _blocks,
    ...seo
  } = page ?? { topics: [], blocks: [] };

  return buildDocMetadata({
    title: pageTitle,
    descriptionFallback: NOT_FOUND_DESCRIPTION_FALLBACK,
    featuredImageUrl: page?.ogImageUrl,
    selfCanonicalPath: "/",
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo,
    robots: getNotFoundRobots(),
    titleOverride:
      page?.metaTitle?.trim() || defaults?.metaTitleFormat?.trim()
        ? undefined
        : NOT_FOUND_META_TITLE_FALLBACK,
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      title: pageTitle,
      description: page?.description,
      sitename: ctx.siteName,
    },
  });
}
