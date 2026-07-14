import type { HomePostCard } from "@/lib/blog-home";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  BLOG_ALL_POSTS_COUNT_QUERY,
  BLOG_ALL_POSTS_PAGE_QUERY,
} from "@pakfactory/sanity/queries";

/** Shared listing page size (all archive + category + topic archives). */
export const LISTING_PAGE_SIZE = 15;

/** Allowed per-page sizes for all blog listings. */
export const PAGE_SIZE_OPTIONS = [15, 30, 50] as const;
export const DEFAULT_PAGE_SIZE = LISTING_PAGE_SIZE;

/** @deprecated Use LISTING_PAGE_SIZE */
export const ALL_ARCHIVE_PAGE_SIZE = LISTING_PAGE_SIZE;

export function parsePerPage(raw: string | string[] | undefined): number {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(str ?? "", 10);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : DEFAULT_PAGE_SIZE;
}

export type AllArchivePageData = {
  posts: HomePostCard[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
  perPage: number;
};

export function parseArchivePageParam(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || String(n) !== raw.trim()) return null;
  if (n < 1) return null;
  return n;
}

export function getTotalArchivePages(
  totalCount: number,
  perPage: number = LISTING_PAGE_SIZE,
): number {
  if (totalCount === 0) return 1;
  return Math.ceil(totalCount / perPage);
}

export function isArchivePageOutOfRange(
  pageNumber: number,
  totalCount: number,
  perPage: number = LISTING_PAGE_SIZE,
): boolean {
  if (pageNumber < 1) return true;
  return pageNumber > getTotalArchivePages(totalCount, perPage);
}

export function archivePageSlice(
  pageNumber: number,
  perPage: number = LISTING_PAGE_SIZE,
): { start: number; end: number } {
  const start = (pageNumber - 1) * perPage;
  return { start, end: start + perPage };
}

export function archivePageHref(
  pageNumber: number,
  perPage?: number,
): string {
  const base = pageNumber <= 1 ? "/all" : `/all/page/${pageNumber}`;
  if (perPage && perPage !== DEFAULT_PAGE_SIZE) {
    return `${base}?perPage=${perPage}`;
  }
  return base;
}

async function fetchPostCount(): Promise<number> {
  if (!isSanityConfigured()) return 0;
  const client = await getSanityClient();
  return client
    .fetch<number>(BLOG_ALL_POSTS_COUNT_QUERY, blogLanguageParams())
    .catch(() => 0);
}

export async function fetchAllArchivePage(
  pageNumber: number,
  perPage: number = DEFAULT_PAGE_SIZE,
): Promise<AllArchivePageData> {
  const totalCount = await fetchPostCount();
  const totalPages = getTotalArchivePages(totalCount, perPage);

  if (isArchivePageOutOfRange(pageNumber, totalCount, perPage)) {
    return { posts: [], totalCount, pageNumber, totalPages, perPage };
  }

  if (!isSanityConfigured()) {
    return { posts: [], totalCount: 0, pageNumber, totalPages: 1, perPage };
  }

  const { start, end } = archivePageSlice(pageNumber, perPage);
  const client = await getSanityClient();
  const posts = await client
    .fetch<HomePostCard[]>(
      BLOG_ALL_POSTS_PAGE_QUERY,
      blogLanguageParams({ start, end }),
    )
    .catch(() => []);

  return { posts, totalCount, pageNumber, totalPages, perPage };
}
