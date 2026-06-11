import { unstable_noStore as noStore } from "next/cache";
import { getSanityClient } from "@/lib/sanity/client";
import {
  getSanityDataset,
  getSanityProjectId,
  isSanityConfigured,
} from "@/lib/sanity/env";
import {
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
  const pinned = await fetchSafe(
    "featured",
    () => getSanityClient().fetch<HomePostCard | null>(FEATURED_HOME_POST_QUERY),
    null,
  );
  if (pinned) return pinned;

  const latestOne = await fetchSafe(
    "latest (featured fallback)",
    () =>
      getSanityClient().fetch<HomePostCard[]>(LATEST_HOME_POSTS_QUERY, {
        excludeId: null,
      }),
    [],
  );
  return latestOne[0] ?? null;
}

async function fetchLatest(excludeId: string | null): Promise<HomePostCard[]> {
  return fetchSafe(
    "latest sidebar",
    () =>
      getSanityClient().fetch<HomePostCard[]>(LATEST_HOME_POSTS_QUERY, {
        excludeId,
      }),
    [],
  );
}

/** Industry-axis `blogTag` pills (tagGroup == "industry"), ordered by `order` then title. */
async function fetchIndustries(): Promise<HomeIndustryPill[]> {
  return fetchSafe(
    "industries",
    () => getSanityClient().fetch<HomeIndustryPill[]>(BLOG_INDUSTRY_TAGS_QUERY),
    [],
  );
}

async function fetchCategoryRows(): Promise<HomeCategoryRow[]> {
  const client = getSanityClient();
  return Promise.all(
    HOME_CATEGORY_SLUGS.map(async (slug) => {
      const posts = await fetchSafe(
        `category:${slug}`,
        () =>
          client.fetch<HomePostCard[]>(POSTS_BY_CATEGORY_SLUG_QUERY, {
            categorySlug: slug,
          }),
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
