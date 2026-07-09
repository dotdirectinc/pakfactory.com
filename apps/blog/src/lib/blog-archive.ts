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

/** @deprecated Use LISTING_PAGE_SIZE */
export const ALL_ARCHIVE_PAGE_SIZE = LISTING_PAGE_SIZE;

export type AllArchivePageData = {
  posts: HomePostCard[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
};

export function parseArchivePageParam(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || String(n) !== raw.trim()) return null;
  if (n < 1) return null;
  return n;
}

export function getTotalArchivePages(totalCount: number): number {
  if (totalCount === 0) return 1;
  return Math.ceil(totalCount / LISTING_PAGE_SIZE);
}

export function isArchivePageOutOfRange(
  pageNumber: number,
  totalCount: number,
): boolean {
  if (pageNumber < 1) return true;
  return pageNumber > getTotalArchivePages(totalCount);
}

export function archivePageSlice(pageNumber: number): { start: number; end: number } {
  const start = (pageNumber - 1) * LISTING_PAGE_SIZE;
  return { start, end: start + LISTING_PAGE_SIZE };
}

export function archivePageHref(pageNumber: number): string {
  return pageNumber <= 1 ? "/all" : `/all/page/${pageNumber}`;
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
): Promise<AllArchivePageData> {
  const totalCount = await fetchPostCount();
  const totalPages = getTotalArchivePages(totalCount);

  if (isArchivePageOutOfRange(pageNumber, totalCount)) {
    return { posts: [], totalCount, pageNumber, totalPages };
  }

  if (!isSanityConfigured()) {
    return { posts: [], totalCount: 0, pageNumber, totalPages: 1 };
  }

  const { start, end } = archivePageSlice(pageNumber);
  const client = await getSanityClient();
  const posts = await client
    .fetch<HomePostCard[]>(
      BLOG_ALL_POSTS_PAGE_QUERY,
      blogLanguageParams({ start, end }),
    )
    .catch(() => []);

  return { posts, totalCount, pageNumber, totalPages };
}
