import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import { enrichPopularRowBlocks } from "@/lib/page-builder";
import { blogContributePageParams } from "@/lib/blog-language";
import {
  buildDocMetadata,
  type DocSeoFields,
} from "@/lib/resolve-seo";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import type { BlogRobotsDirective } from "@/lib/seo";
import { getPreviewableSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { BLOG_CONTRIBUTE_PAGE_BUILDER_QUERY } from "@pakfactory/sanity/queries";

const CONTRIBUTE_TITLE_FALLBACK = "Write for Us";
const CONTRIBUTE_META_TITLE_FALLBACK = "Write for Us | PakFactory Blog";
const CONTRIBUTE_DESCRIPTION_FALLBACK =
  "Pitch a guest post for the PakFactory blog. See the packaging topics we publish, who we're looking for, and how to submit.";

export type BlogContributePageDoc = DocSeoFields & {
  title?: string | null;
  description?: string | null;
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
      console.error(`[blog-contribute-page] ${label} failed:`, err);
    }
    return fallback;
  }
}

export async function fetchBlogContributePage(): Promise<BlogContributePageDoc | null> {
  if (process.env.NODE_ENV === "development") {
    noStore();
  }
  if (!isSanityConfigured()) return null;

  const client = await getPreviewableSanityClient();
  const doc = await fetchSafe(
    "contributePage",
    () =>
      client.fetch<BlogContributePageDoc | null>(
        BLOG_CONTRIBUTE_PAGE_BUILDER_QUERY,
        blogContributePageParams(),
      ),
    null,
  );

  if (!doc) return null;

  return {
    ...doc,
    pageBuilder: await enrichPopularRowBlocks(doc.pageBuilder),
  };
}

export function resolveContributePageTitle(
  page: BlogContributePageDoc | null | undefined,
): string {
  return page?.title?.trim() || CONTRIBUTE_TITLE_FALLBACK;
}

export function resolveContributePageDescription(
  page: BlogContributePageDoc | null | undefined,
): string {
  return (
    page?.metaDescription?.trim() ||
    CONTRIBUTE_DESCRIPTION_FALLBACK
  );
}

export async function buildBlogContributeMetadata(
  page: BlogContributePageDoc | null,
  robots: BlogRobotsDirective,
): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "pageDefaults");
  const pageTitle = page?.title?.trim() || CONTRIBUTE_TITLE_FALLBACK;

  return buildDocMetadata({
    title: pageTitle,
    descriptionFallback: CONTRIBUTE_DESCRIPTION_FALLBACK,
    featuredImageUrl: page?.ogImageUrl,
    selfCanonicalPath: "/contribute",
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: page ?? {},
    robots,
    titleOverride:
      page?.metaTitle?.trim() || defaults?.metaTitleFormat?.trim()
        ? undefined
        : CONTRIBUTE_META_TITLE_FALLBACK,
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      title: pageTitle,
      description: page?.description,
      sitename: ctx.siteName,
    },
  });
}
