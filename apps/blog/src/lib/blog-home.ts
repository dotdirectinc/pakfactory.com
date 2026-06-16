import { unstable_noStore as noStore } from "next/cache";
import { getPreviewableSanityClient } from "@/lib/sanity/client";
import { blogHomePageParams, blogLanguageParams } from "@/lib/blog-language";
import {
  getSanityDataset,
  getSanityProjectId,
  isSanityConfigured,
} from "@/lib/sanity/env";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import {
  BLOG_HOME_PAGE_BUILDER_QUERY,
  BLOG_INDUSTRY_TAGS_QUERY,
  FEATURED_HOME_POST_QUERY,
  LATEST_HOME_POSTS_QUERY,
  POSTS_BY_CATEGORY_SLUG_QUERY,
} from "@pakfactory/sanity/queries";

/** Home category row order per PROD-1497 / studio `blogCategory` slugs. */
export const HOME_CATEGORY_SLUGS = [
  "packaging-news",
  "trends",
  "business-strategy",
  "sustainability",
  "design-inspiration",
] as const;

export type HomePostCard = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  mainImage?: unknown;
  categorySlug?: string;
  categoryTitle?: string;
  authorName?: string;
  authorImageUrl?: string;
  readingTimeMinutes?: number;
};

/** Industry pill — an industry-axis `blogTag`; links to `/tag/{slug}`. */
export type HomeIndustryPill = {
  _id?: string;
  title: string;
  slug: string;
};

export type HomeCategoryRow = {
  slug: (typeof HOME_CATEGORY_SLUGS)[number];
  title: string;
  posts: HomePostCard[];
};

const CATEGORY_TITLES: Record<(typeof HOME_CATEGORY_SLUGS)[number], string> = {
  "packaging-news": "Packaging News",
  trends: "Trends",
  "business-strategy": "Business Strategy",
  sustainability: "Sustainability",
  "design-inspiration": "Design Inspiration",
};

export type BlogHomeData = {
  featured: HomePostCard | null;
  latest: HomePostCard[];
  industries: HomeIndustryPill[];
  categoryRows: HomeCategoryRow[];
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
      console.error(`[blog-home] ${label} failed:`, err);
    }
    return fallback;
  }
}

async function fetchFeatured(): Promise<HomePostCard | null> {
  const client = await getPreviewableSanityClient();
  const pinned = await fetchSafe(
    "featured",
    () =>
      client.fetch<HomePostCard | null>(
        FEATURED_HOME_POST_QUERY,
        blogLanguageParams(),
      ),
    null,
  );
  if (pinned) return pinned;

  const latestOne = await fetchSafe(
    "latest (featured fallback)",
    () =>
      client.fetch<HomePostCard[]>(
        LATEST_HOME_POSTS_QUERY,
        blogLanguageParams({ excludeId: null }),
      ),
    [],
  );
  return latestOne[0] ?? null;
}

async function fetchLatest(excludeId: string | null): Promise<HomePostCard[]> {
  const client = await getPreviewableSanityClient();
  return fetchSafe(
    "latest sidebar",
    () =>
      client.fetch<HomePostCard[]>(
        LATEST_HOME_POSTS_QUERY,
        blogLanguageParams({ excludeId }),
      ),
    [],
  );
}

/** Industry-axis `blogTag` pills (tagGroup == "industry"), ordered by `order` then title. */
async function fetchIndustries(): Promise<HomeIndustryPill[]> {
  const client = await getPreviewableSanityClient();
  return fetchSafe(
    "industries",
    () =>
      client.fetch<HomeIndustryPill[]>(
        BLOG_INDUSTRY_TAGS_QUERY,
        blogLanguageParams(),
      ),
    [],
  );
}

async function fetchCategoryRows(): Promise<HomeCategoryRow[]> {
  const client = await getPreviewableSanityClient();
  return Promise.all(
    HOME_CATEGORY_SLUGS.map(async (slug) => {
      const posts = await fetchSafe(
        `category:${slug}`,
        () =>
          client.fetch<HomePostCard[]>(
            POSTS_BY_CATEGORY_SLUG_QUERY,
            blogLanguageParams({ categorySlug: slug }),
          ),
        [],
      );
      return {
        slug,
        title: CATEGORY_TITLES[slug],
        posts,
      };
    }),
  );
}

/** Dev-only context when the home page renders with zero CMS posts. */
export type BlogHomeDebugInfo = {
  configured: boolean;
  projectId: string;
  dataset: string;
  hasReadToken: boolean;
};

export function getBlogHomeDebugInfo(): BlogHomeDebugInfo {
  return {
    configured: isSanityConfigured(),
    projectId: getSanityProjectId() || "(missing)",
    dataset: getSanityDataset(),
    hasReadToken: Boolean(process.env.SANITY_API_READ_TOKEN?.trim()),
  };
}

/**
 * Sanity-driven page builder for the homepage. Returns the home singleton's
 * `pageBuilder` array (ADR-009 `blogPage` with `pageRole == home`), or empty
 * when unpopulated / Sanity is not configured.
 *
 * Uses the draft-mode-aware client so that under the Studio Presentation tool
 * (draft mode on) the blocks render with the `drafts` perspective + stega,
 * letting visual-editing overlays resolve each widget. Outside draft mode this
 * returns the published client, so normal traffic is unchanged.
 */
export async function fetchBlogHomePageBuilder(): Promise<PageBuilderBlock[]> {
  if (process.env.NODE_ENV === "development") {
    noStore();
  }
  if (!isSanityConfigured()) return [];

  const client = await getPreviewableSanityClient();
  const doc = await fetchSafe(
    "pageBuilder",
    () =>
      client.fetch<{ pageBuilder?: PageBuilderBlock[] | null } | null>(
        BLOG_HOME_PAGE_BUILDER_QUERY,
        blogHomePageParams(),
      ),
    null,
  );
  return doc?.pageBuilder ?? [];
}

export async function fetchBlogHomeData(): Promise<BlogHomeData> {
  if (process.env.NODE_ENV === "development") {
    noStore();
  }

  if (!isSanityConfigured()) {
    return {
      featured: null,
      latest: [],
      industries: [],
      categoryRows: HOME_CATEGORY_SLUGS.map((slug) => ({
        slug,
        title: CATEGORY_TITLES[slug],
        posts: [],
      })),
    };
  }

  const featured = await fetchFeatured();
  const [latest, industries, categoryRows] = await Promise.all([
    fetchLatest(featured?._id ?? null),
    fetchIndustries(),
    fetchCategoryRows(),
  ]);

  return { featured, latest, industries, categoryRows };
}
