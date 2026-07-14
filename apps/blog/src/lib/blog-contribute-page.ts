import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import { enrichPopularRowBlocks } from "@/lib/page-builder";
import { blogContributePageParams } from "@/lib/blog-language";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import {
  buildDocMetadata,
  type DocSeoFields,
} from "@/lib/resolve-seo";
import type { BlogRobotsDirective } from "@/lib/seo";
import { getPreviewableSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { BLOG_CONTRIBUTE_PAGE_BUILDER_QUERY } from "@pakfactory/sanity/queries";

const CONTRIBUTE_TITLE_FALLBACK = "Contribute to Our Blog";
const CONTRIBUTE_META_TITLE_FALLBACK = "Contribute to Our Blog | PakFactory Blog";
const CONTRIBUTE_DESCRIPTION_FALLBACK =
  "Write for the PakFactory blog. We publish guest articles for the people who specify, design, and source custom packaging — brand owners, designers, and packaging teams. Pitch your idea below.";

export type BlogContributePageDoc = DocSeoFields & {
  title?: string | null;
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
  const settings = await fetchBlogGlobalSettings();
  return buildDocMetadata({
    title: CONTRIBUTE_META_TITLE_FALLBACK,
    descriptionFallback: CONTRIBUTE_DESCRIPTION_FALLBACK,
    featuredImageUrl: page?.ogImageUrl,
    selfCanonicalPath: "/contribute",
    defaultOgImageUrl: settings?.defaultOgImageUrl,
    seo: page ?? {},
    robots,
    titleOverride: page?.metaTitle?.trim()
      ? undefined
      : CONTRIBUTE_META_TITLE_FALLBACK,
  });
}
