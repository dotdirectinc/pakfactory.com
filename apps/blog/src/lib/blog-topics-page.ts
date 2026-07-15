import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import type { TopicsPageGroupRow } from "@/lib/blog-topics-index";
import { enrichPopularRowBlocks } from "@/lib/page-builder";
import { blogTopicsPageParams } from "@/lib/blog-language";
import {
  buildDocMetadata,
  type DocSeoFields,
} from "@/lib/resolve-seo";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import type { BlogRobotsDirective } from "@/lib/seo";
import { getPreviewableSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { BLOG_TOPICS_PAGE_BUILDER_QUERY } from "@pakfactory/sanity/queries";

const TOPICS_TITLE_FALLBACK = "Browse Packaging Topics";
const TOPICS_META_TITLE_FALLBACK = "Browse Packaging Topics | PakFactory Blog";
const TOPICS_DESCRIPTION_FALLBACK =
  "Browse every packaging topic on the PakFactory blog, by industry, packaging type, material, and finish.";

export type BlogTopicsPageDoc = DocSeoFields & {
  title?: string | null;
  description?: string | null;
  topics?: TopicsPageGroupRow[] | null;
  pageBuilder?: PageBuilderBlock[] | null;
};

async function fetchSafe<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[blog-topics-page] ${label} failed:`, err);
    }
    return fallback;
  }
}

export async function fetchBlogTopicsPage(): Promise<BlogTopicsPageDoc | null> {
  if (process.env.NODE_ENV === "development") {
    noStore();
  }
  if (!isSanityConfigured()) return null;

  const client = await getPreviewableSanityClient();
  const doc = await fetchSafe(
    "topicsPage",
    () =>
      client.fetch<BlogTopicsPageDoc | null>(
        BLOG_TOPICS_PAGE_BUILDER_QUERY,
        blogTopicsPageParams(),
      ),
    null,
  );

  if (!doc) return null;

  return {
    ...doc,
    pageBuilder: await enrichPopularRowBlocks(doc.pageBuilder),
  };
}

export function resolveTopicsPageTitle(
  page: BlogTopicsPageDoc | null | undefined,
): string {
  return page?.title?.trim() || TOPICS_TITLE_FALLBACK;
}

export function resolveTopicsPageDescription(
  page: BlogTopicsPageDoc | null | undefined,
): string | undefined {
  const fromOverview = page?.description?.trim();
  if (fromOverview) return fromOverview;
  return undefined;
}

export function resolveTopicsPageJsonLdDescription(
  page: BlogTopicsPageDoc | null | undefined,
): string {
  return (
    resolveTopicsPageDescription(page) ||
    page?.metaDescription?.trim() ||
    TOPICS_DESCRIPTION_FALLBACK
  );
}

export async function buildBlogTopicsMetadata(
  page: BlogTopicsPageDoc | null,
  robots: BlogRobotsDirective,
): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "pageDefaults");
  const pageTitle = page?.title?.trim() || TOPICS_TITLE_FALLBACK;
  const overviewDescription = resolveTopicsPageDescription(page);

  return buildDocMetadata({
    title: pageTitle,
    descriptionFallback: TOPICS_DESCRIPTION_FALLBACK,
    featuredImageUrl: page?.ogImageUrl,
    selfCanonicalPath: "/topics",
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: page ?? {},
    robots,
    titleOverride:
      page?.metaTitle?.trim() || defaults?.metaTitleFormat?.trim()
        ? undefined
        : TOPICS_META_TITLE_FALLBACK,
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      title: pageTitle,
      description: overviewDescription,
      sitename: ctx.siteName,
    },
  });
}
