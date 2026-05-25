import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import {
  FEATURED_HOME_POST_QUERY,
  INDUSTRIES_FOR_BLOG_HOME_QUERY,
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
  categoryTitle?: string;
  authorName?: string;
};

export type HomeIndustryPill = {
  _id?: string;
  title: string;
  slug: string;
};

/** Static pills when fewer than 10 `industry` docs exist (slugs match studio seed / www). */
export const BLOG_HOME_INDUSTRY_FALLBACK: HomeIndustryPill[] = [
  { title: "Apparel & Fashion", slug: "apparel-fashion" },
  { title: "Food & Beverage", slug: "food-beverage" },
  { title: "Cosmetics & Beauty", slug: "cosmetics-beauty" },
  { title: "Electronics & Tech", slug: "electronics-tech" },
  { title: "Health & Wellness", slug: "health-wellness" },
  { title: "Pharma & Healthcare", slug: "pharma-healthcare" },
  { title: "Home & Garden", slug: "home-garden" },
  { title: "Pet Products", slug: "pet-products" },
  { title: "Cannabis", slug: "cannabis" },
  { title: "Luxury & Spirits", slug: "luxury-spirits" },
];

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
  const pinned = await getSanityClient()
    .fetch<HomePostCard | null>(FEATURED_HOME_POST_QUERY)
    .catch(() => null);
  if (pinned) return pinned;

  const latestOne = await getSanityClient()
    .fetch<HomePostCard[]>(LATEST_HOME_POSTS_QUERY, { excludeId: null })
    .catch(() => []);
  return latestOne[0] ?? null;
}

async function fetchLatest(excludeId: string | null): Promise<HomePostCard[]> {
  return getSanityClient()
    .fetch<HomePostCard[]>(LATEST_HOME_POSTS_QUERY, { excludeId })
    .catch(() => []);
}

async function fetchIndustries(): Promise<HomeIndustryPill[]> {
  const fromCms = await getSanityClient()
    .fetch<HomeIndustryPill[]>(INDUSTRIES_FOR_BLOG_HOME_QUERY)
    .catch(() => []);

  const seen = new Set<string>();
  const merged: HomeIndustryPill[] = [];
  for (const row of [...fromCms, ...BLOG_HOME_INDUSTRY_FALLBACK]) {
    if (merged.length >= 10) break;
    if (seen.has(row.slug)) continue;
    seen.add(row.slug);
    merged.push(row);
  }
  return merged;
}

async function fetchCategoryRows(): Promise<HomeCategoryRow[]> {
  const client = getSanityClient();
  return Promise.all(
    HOME_CATEGORY_SLUGS.map(async (slug) => {
      const posts = await client
        .fetch<HomePostCard[]>(POSTS_BY_CATEGORY_SLUG_QUERY, { categorySlug: slug })
        .catch(() => []);
      return {
        slug,
        title: CATEGORY_TITLES[slug],
        posts,
      };
    }),
  );
}

export async function fetchBlogHomeData(): Promise<BlogHomeData> {
  if (!isSanityConfigured()) {
    return {
      featured: null,
      latest: [],
      industries: BLOG_HOME_INDUSTRY_FALLBACK.slice(0, 10),
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
