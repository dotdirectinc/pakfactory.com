import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { getPublishedSanityClient, getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { DEFAULT_BLOG_LANGUAGE } from "@pakfactory/sanity/languages";
import {
  BLOG_CATEGORIES_QUERY,
  BLOG_FOOTER_NAV_QUERY,
  BLOG_NAV_CATEGORIES_QUERY,
  POPULAR_POSTS_LATEST_QUERY,
  POPULAR_POSTS_THIS_MONTH_QUERY,
} from "@pakfactory/sanity/queries";
import {
  getFallbackFooterColumns,
  resolveFooterColumns,
  type BlogFooterColumns,
  type BlogFooterNavDoc,
} from "@/lib/blog-footer-nav";
import {
  BLOG_REVALIDATE_SECONDS,
  BLOG_SETTINGS_CACHE_TAG,
} from "@/lib/blog-cache";
import {
  BLOG_CATEGORY_FALLBACK,
  type BlogCategoryChip,
} from "@/lib/blog-categories";

export type PopularPostCard = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  mainImage?: unknown;
  categorySlug?: string;
};

type BlogNavCategoryRow = BlogCategoryChip & {
  language?: string | null;
};

type BlogNavSettingsDoc = {
  _id?: string;
  categories?: (BlogNavCategoryRow | null)[] | null;
} | null;

function resolveNavCategories(
  doc: BlogNavSettingsDoc,
  language: string = DEFAULT_BLOG_LANGUAGE,
): BlogCategoryChip[] {
  if (doc?._id) {
    return (doc.categories ?? [])
      .filter((row): row is BlogNavCategoryRow => row != null)
      .filter((row) => (row.language ?? language) === language)
      .filter(
        (row): row is BlogCategoryChip =>
          Boolean(row.slug?.trim() && row.title?.trim()),
      )
      .map(({ _id, title, slug }) => ({ _id, title, slug }));
  }
  return [];
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function loadBlogNavCategoriesFromClient(
  fetchDoc: () => Promise<BlogNavSettingsDoc>,
  language: string = DEFAULT_BLOG_LANGUAGE,
): Promise<BlogCategoryChip[]> {
  if (!isSanityConfigured()) {
    return [];
  }
  const doc = await fetchDoc().catch(() => null);
  return resolveNavCategories(doc, language);
}

async function loadPublishedBlogNavCategories(): Promise<BlogCategoryChip[]> {
  const params = blogLanguageParams();
  return loadBlogNavCategoriesFromClient(
    () =>
      getPublishedSanityClient().fetch<BlogNavSettingsDoc>(
        BLOG_NAV_CATEGORIES_QUERY,
        params,
      ),
    params.language,
  );
}

const getCachedBlogNavCategories = unstable_cache(
  loadPublishedBlogNavCategories,
  ["blog-nav-categories"],
  {
    revalidate: BLOG_REVALIDATE_SECONDS,
    tags: [BLOG_SETTINGS_CACHE_TAG],
  },
);

export async function fetchBlogCategories(): Promise<BlogCategoryChip[]> {
  if (!isSanityConfigured()) {
    return [...BLOG_CATEGORY_FALLBACK];
  }
  const rows = await (await getSanityClient())
    .fetch<BlogCategoryChip[]>(BLOG_CATEGORIES_QUERY, blogLanguageParams())
    .catch(() => []);
  if (rows.length > 0) return rows;
  return [...BLOG_CATEGORY_FALLBACK];
}

/**
 * Sub-nav categories — exact order from Blog Navigation `primaryNavigation.categories`.
 * Returns only what editors configured; empty when unset, missing settings,
 * Sanity unconfigured, or fetch fails. Slug/language/null-ref filtering happens in
 * `resolveNavCategories` (GROQ preserves editor order on dereferenced categories).
 */
export async function fetchBlogNavCategories(): Promise<BlogCategoryChip[]> {
  if (!isSanityConfigured()) {
    return [];
  }

  if ((await draftMode()).isEnabled) {
    const client = await getSanityClient();
    const params = blogLanguageParams();
    return loadBlogNavCategoriesFromClient(
      () =>
        client.fetch<BlogNavSettingsDoc>(BLOG_NAV_CATEGORIES_QUERY, params),
      params.language,
    );
  }

  return getCachedBlogNavCategories();
}

async function loadBlogFooterNavigationFromClient(
  fetchDoc: () => Promise<BlogFooterNavDoc>,
): Promise<BlogFooterColumns> {
  if (!isSanityConfigured()) {
    return getFallbackFooterColumns();
  }

  const doc = await fetchDoc().catch(() => null);
  const columns = resolveFooterColumns(doc);
  if (columns.length > 0) {
    return columns;
  }

  return getFallbackFooterColumns();
}

async function loadPublishedBlogFooterNavigation(): Promise<BlogFooterColumns> {
  return loadBlogFooterNavigationFromClient(() =>
    getPublishedSanityClient().fetch<BlogFooterNavDoc>(
      BLOG_FOOTER_NAV_QUERY,
    ),
  );
}

const getCachedBlogFooterNavigation = unstable_cache(
  loadPublishedBlogFooterNavigation,
  ["blog-footer-navigation"],
  {
    revalidate: BLOG_REVALIDATE_SECONDS,
    tags: [BLOG_SETTINGS_CACHE_TAG],
  },
);

/**
 * Footer link columns from Blog Navigation `footerNavigation.columns`.
 * Falls back to hardcoded columns when Sanity is unconfigured, fetch fails,
 * or editors have not configured footer columns yet.
 */
export async function fetchBlogFooterNavigation(): Promise<BlogFooterColumns> {
  if (!isSanityConfigured()) {
    return getFallbackFooterColumns();
  }

  if ((await draftMode()).isEnabled) {
    const client = await getSanityClient();
    return loadBlogFooterNavigationFromClient(() =>
      client.fetch<BlogFooterNavDoc>(BLOG_FOOTER_NAV_QUERY),
    );
  }

  return getCachedBlogFooterNavigation();
}

export async function fetchPopularPostsThisMonth(): Promise<PopularPostCard[]> {
  if (!isSanityConfigured()) return [];

  const client = await getSanityClient();
  const monthStart = monthStartIso();

  const thisMonth = await client
    .fetch<PopularPostCard[]>(
      POPULAR_POSTS_THIS_MONTH_QUERY,
      blogLanguageParams({ monthStart }),
    )
    .catch(() => []);

  if (thisMonth.length >= 3) return thisMonth.slice(0, 3);

  const latest = await client
    .fetch<PopularPostCard[]>(
      POPULAR_POSTS_LATEST_QUERY,
      blogLanguageParams(),
    )
    .catch(() => []);

  const seen = new Set(thisMonth.map((p) => p._id));
  const merged = [...thisMonth];
  for (const post of latest) {
    if (merged.length >= 3) break;
    if (!seen.has(post._id)) {
      seen.add(post._id);
      merged.push(post);
    }
  }
  return merged.slice(0, 3);
}
