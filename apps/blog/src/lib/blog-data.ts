import { unstable_cache, unstable_noStore as noStore } from "next/cache";
import { draftMode } from "next/headers";
import {
  getPreviewableSanityClient,
  getPublishedSanityClient,
  getSanityClient,
} from "@/lib/sanity/client";
import {
  blogLanguageParams,
  blogNotFoundPageParams,
  blogSearchPageParams,
} from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { DEFAULT_BLOG_LANGUAGE } from "@pakfactory/sanity/languages";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import { enrichPopularRowBlocks } from "@/lib/page-builder";
import {
  BLOG_CATEGORIES_QUERY,
  BLOG_FOOTER_NAV_QUERY,
  BLOG_NAV_CATEGORIES_QUERY,
  BLOG_NOT_FOUND_PAGE_BUILDER_QUERY,
  BLOG_NOT_FOUND_TOPICS_FALLBACK_QUERY,
  BLOG_SEARCH_PAGE_BUILDER_QUERY,
  POPULAR_POSTS_LATEST_QUERY,
  POPULAR_POSTS_THIS_MONTH_QUERY,
} from "@pakfactory/sanity/queries";
import {
  getFallbackFooterData,
  resolveFooterData,
  type BlogFooterData,
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
  categoryTitle?: string;
  authorName?: string;
  authorSlug?: string;
  authorImageUrl?: string;
  readingTimeMinutes?: number;
};

type BlogNavCategoryRow = BlogCategoryChip & {
  language?: string | null;
  navLabel?: string | null;
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
        (row): row is BlogNavCategoryRow =>
          Boolean(row.slug?.trim() && row.title?.trim()),
      )
      // Nav bar shows the category's Nav label when set, else its Name.
      .map(({ _id, title, navLabel, slug }) => ({
        _id,
        title: navLabel?.trim() || title,
        slug,
      }));
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

export type TopicChip = { _id?: string; title: string; slug: string };

export type BlogNotFoundContent = {
  topics: TopicChip[];
  blocks: PageBuilderBlock[];
};

export type BlogSearchContent = {
  topics: TopicChip[];
  blocks: PageBuilderBlock[];
};

/**
 * 404 page content — the `blogNotFoundPage` singleton's curated recovery topics
 * (falling back to the newest topics when none are curated) and page-builder blocks.
 */
export async function fetchBlogNotFoundPage(): Promise<BlogNotFoundContent> {
  if (process.env.NODE_ENV === "development") {
    noStore();
  }
  if (!isSanityConfigured()) return { topics: [], blocks: [] };
  const client = await getPreviewableSanityClient();
  const page = await client
    .fetch<{
      topics?: TopicChip[];
      pageBuilder?: PageBuilderBlock[] | null;
    } | null>(BLOG_NOT_FOUND_PAGE_BUILDER_QUERY, blogNotFoundPageParams())
    .catch(() => null);

  let topics = (page?.topics ?? []).filter((t) => t?.slug);
  if (topics.length === 0) {
    const fallback = await client
      .fetch<TopicChip[]>(BLOG_NOT_FOUND_TOPICS_FALLBACK_QUERY, blogLanguageParams())
      .catch(() => []);
    topics = (fallback ?? []).filter((t) => t?.slug);
  }

  const blocks = await enrichPopularRowBlocks(page?.pageBuilder);

  return {
    topics,
    blocks,
  };
}

/**
 * Search page content — the `blogSearchPage` singleton's curated recommended
 * topics (falling back to newest topics) and page-builder blocks. Content source
 * for the reserved `/search` route; not slug-routable.
 */
export async function fetchBlogSearchPage(): Promise<BlogSearchContent> {
  if (process.env.NODE_ENV === "development") {
    noStore();
  }
  if (!isSanityConfigured()) return { topics: [], blocks: [] };
  const client = await getPreviewableSanityClient();
  const page = await client
    .fetch<{
      topics?: TopicChip[];
      pageBuilder?: PageBuilderBlock[] | null;
    } | null>(BLOG_SEARCH_PAGE_BUILDER_QUERY, blogSearchPageParams())
    .catch(() => null);

  let topics = (page?.topics ?? []).filter((t) => t?.slug);
  if (topics.length === 0) {
    const fallback = await client
      .fetch<TopicChip[]>(BLOG_NOT_FOUND_TOPICS_FALLBACK_QUERY, blogLanguageParams())
      .catch(() => []);
    topics = (fallback ?? []).filter((t) => t?.slug);
  }

  const blocks = await enrichPopularRowBlocks(page?.pageBuilder);

  return {
    topics,
    blocks,
  };
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
): Promise<BlogFooterData> {
  if (!isSanityConfigured()) {
    return getFallbackFooterData();
  }

  const doc = await fetchDoc().catch(() => null);
  return resolveFooterData(doc);
}

async function loadPublishedBlogFooterNavigation(): Promise<BlogFooterData> {
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
 * Footer link columns, social links, and AI answer links from Blog Navigation.
 * When the `blogNavigation` document exists, empty sections render empty.
 * Full hardcoded defaults apply only when Sanity is unconfigured, the fetch
 * fails, or the document is missing.
 */
export async function fetchBlogFooterNavigation(): Promise<BlogFooterData> {
  if (!isSanityConfigured()) {
    return getFallbackFooterData();
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
