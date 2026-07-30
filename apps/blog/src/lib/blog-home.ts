import type { Metadata } from "next";
import { blogCachedFetch } from "@/lib/blog-cached-fetch";
import {
  BLOG_CATEGORY_CACHE_TAG,
  BLOG_PAGE_CACHE_TAG,
  BLOG_POSTS_CACHE_TAG,
  BLOG_TOPIC_CACHE_TAG,
} from "@/lib/blog-cache";
import { blogHomePageParams, blogLanguageParams } from "@/lib/blog-language";
import {
  buildDocMetadata,
  type DocSeoFields,
} from "@/lib/resolve-seo";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
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
  authorSlug?: string;
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

async function fetchFeatured(): Promise<HomePostCard | null> {
  const pinned = await blogCachedFetch<HomePostCard | null>({
    cacheKey: "home-featured",
    query: FEATURED_HOME_POST_QUERY,
    params: blogHomePageParams(),
    tags: [BLOG_POSTS_CACHE_TAG],
    fallback: null,
    label: "featured",
  });
  if (pinned) return pinned;

  const latestOne = await blogCachedFetch<HomePostCard[]>({
    cacheKey: "home-latest",
    query: LATEST_HOME_POSTS_QUERY,
    params: blogLanguageParams({ excludeId: null }),
    tags: [BLOG_POSTS_CACHE_TAG],
    fallback: [],
    label: "latest (featured fallback)",
  });
  return latestOne[0] ?? null;
}

async function fetchLatest(excludeId: string | null): Promise<HomePostCard[]> {
  return blogCachedFetch<HomePostCard[]>({
    cacheKey: "home-latest",
    query: LATEST_HOME_POSTS_QUERY,
    params: blogLanguageParams({ excludeId }),
    tags: [BLOG_POSTS_CACHE_TAG],
    fallback: [],
    label: "latest sidebar",
  });
}

/** Industry-group `blogTag` pills (topicGroup slug `industry`), ordered by title. */
async function fetchIndustries(): Promise<HomeIndustryPill[]> {
  return blogCachedFetch<HomeIndustryPill[]>({
    cacheKey: "home-industries",
    query: BLOG_INDUSTRY_TAGS_QUERY,
    params: blogLanguageParams(),
    tags: [BLOG_TOPIC_CACHE_TAG],
    fallback: [],
    label: "industries",
  });
}

async function fetchCategoryRows(): Promise<HomeCategoryRow[]> {
  return Promise.all(
    HOME_CATEGORY_SLUGS.map(async (slug) => {
      const posts = await blogCachedFetch<HomePostCard[]>({
        cacheKey: "home-category-row",
        query: POSTS_BY_CATEGORY_SLUG_QUERY,
        params: blogLanguageParams({ categorySlug: slug }),
        // Post changes + a category rename both affect this row.
        tags: [BLOG_POSTS_CACHE_TAG, BLOG_CATEGORY_CACHE_TAG],
        fallback: [],
        label: `category:${slug}`,
      });
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
  return blogCachedFetch<BlogHomePageDoc | null>({
    cacheKey: "home-page-builder",
    query: BLOG_HOME_PAGE_BUILDER_QUERY,
    params: blogHomePageParams(),
    // pageBuilder embeds postCategoryRow → category->shortDescription + posts.
    // Without category/posts tags, a category publish left the homepage stale for
    // up to BLOG_CONTENT_REVALIDATE_SECONDS (PROD-2226 short-description miss).
    tags: [BLOG_PAGE_CACHE_TAG, BLOG_CATEGORY_CACHE_TAG, BLOG_POSTS_CACHE_TAG],
    fallback: null,
    label: "homePage",
  });
}

export async function buildBlogHomeMetadata(
  home: BlogHomePageDoc | null,
  robots: BlogRobotsDirective,
): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "pageDefaults");
  const pageTitle = home?.title?.trim() || "PakFactory Blog";

  return buildDocMetadata({
    title: pageTitle,
    descriptionFallback: HOME_DESCRIPTION_FALLBACK,
    featuredImageUrl: home?.ogImageUrl,
    selfCanonicalPath: "/",
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: home ?? {},
    robots,
    // Last resort when CMS meta and Blog Settings formats are both blank.
    titleOverride:
      home?.metaTitle?.trim() || defaults?.metaTitleFormat?.trim()
        ? undefined
        : HOME_TITLE_FALLBACK,
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      title: pageTitle,
      sitename: ctx.siteName,
    },
  });
}

/** Homepage `pageBuilder` blocks only — see `fetchBlogHomePage` for SEO fields. */
export async function fetchBlogHomePageBuilder(): Promise<PageBuilderBlock[]> {
  const doc = await fetchBlogHomePage();
  return doc?.pageBuilder ?? [];
}

export async function fetchBlogHomeData(): Promise<BlogHomeData> {
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
