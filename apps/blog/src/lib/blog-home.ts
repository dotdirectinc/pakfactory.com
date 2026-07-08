import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { getPreviewableSanityClient } from "@/lib/sanity/client";
import { blogHomePageParams, blogLanguageParams } from "@/lib/blog-language";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import {
  buildDocMetadata,
  type DocSeoFields,
} from "@/lib/resolve-seo";
import {
  getListingRobotsFromSearchParams,
  type BlogRobotsDirective,
} from "@/lib/seo";
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

/** Industry pill — an industry-axis `blogTag`; links to `/topics/{slug}`. */
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
        blogHomePageParams(),
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

/** Industry-group `blogTag` pills (topicGroup slug `industry`), ordered by title. */
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
 * Homepage CMS document (ADR-009 `blogPage` with `pageRole == home`).
 * Uses the draft-mode-aware client under Studio Presentation.
 */
export type BlogHomePageDoc = DocSeoFields & {
  title?: string | null;
  srHeading?: string | null;
  pageBuilder?: PageBuilderBlock[] | null;
};

const HOME_TITLE_FALLBACK =
  "PakFactory Blog — Packaging Insights, Trends & Industry News";
const HOME_H1_FALLBACK = "PakFactory Blog";
const HOME_DESCRIPTION_FALLBACK =
  "Curated packaging insights across trends, sustainability, business strategy, design, and industry news from PakFactory.";

/** Resolve the homepage sr-only H1: srHeading → title → siteTitle → fallback. */
export function resolveHomePageH1(
  home: BlogHomePageDoc | null | undefined,
  settings?: { siteTitle?: string | null } | null,
): string {
  const fromSr = home?.srHeading?.trim();
  if (fromSr) return fromSr;
  const fromTitle = home?.title?.trim();
  if (fromTitle) return fromTitle;
  const fromSite = settings?.siteTitle?.trim();
  if (fromSite) return fromSite;
  return HOME_H1_FALLBACK;
}

export async function fetchBlogHomePage(): Promise<BlogHomePageDoc | null> {
  if (process.env.NODE_ENV === "development") {
    noStore();
  }
  if (!isSanityConfigured()) return null;

  const client = await getPreviewableSanityClient();
  return fetchSafe(
    "homePage",
    () =>
      client.fetch<BlogHomePageDoc | null>(
        BLOG_HOME_PAGE_BUILDER_QUERY,
        blogHomePageParams(),
      ),
    null,
  );
}

export async function buildBlogHomeMetadata(
  home: BlogHomePageDoc | null,
  robots: BlogRobotsDirective,
): Promise<Metadata> {
  const settings = await fetchBlogGlobalSettings();
  return buildDocMetadata({
    title: "PakFactory Blog",
    descriptionFallback: HOME_DESCRIPTION_FALLBACK,
    featuredImageUrl: home?.ogImageUrl,
    selfCanonicalPath: "/",
    defaultOgImageUrl: settings?.defaultOgImageUrl,
    seo: home ?? {},
    robots,
    titleOverride: home?.metaTitle?.trim()
      ? undefined
      : HOME_TITLE_FALLBACK,
  });
}

/** Homepage `pageBuilder` blocks only — see `fetchBlogHomePage` for SEO fields. */
export async function fetchBlogHomePageBuilder(): Promise<PageBuilderBlock[]> {
  const doc = await fetchBlogHomePage();
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
