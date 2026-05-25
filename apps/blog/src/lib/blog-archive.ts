import type { HomePostCard } from "@/lib/blog-home";
import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import {
  BLOG_ALL_POSTS_COUNT_QUERY,
  BLOG_ALL_POSTS_PAGE_QUERY,
} from "@pakfactory/sanity/queries";

export const ALL_ARCHIVE_PAGE_SIZE = 12;

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
  return Math.ceil(totalCount / ALL_ARCHIVE_PAGE_SIZE);
}

export function isArchivePageOutOfRange(
  pageNumber: number,
  totalCount: number,
): boolean {
  if (pageNumber < 1) return true;
  return pageNumber > getTotalArchivePages(totalCount);
}

export function archivePageSlice(pageNumber: number): { start: number; end: number } {
  const start = (pageNumber - 1) * ALL_ARCHIVE_PAGE_SIZE;
  return { start, end: start + ALL_ARCHIVE_PAGE_SIZE };
}

export function archivePageHref(pageNumber: number): string {
  return pageNumber <= 1 ? "/all" : `/all/page/${pageNumber}`;
}

async function fetchPostCount(): Promise<number> {
  if (!isSanityConfigured()) return 0;
  return getSanityClient()
    .fetch<number>(BLOG_ALL_POSTS_COUNT_QUERY)
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
  const posts = await getSanityClient()
    .fetch<HomePostCard[]>(BLOG_ALL_POSTS_PAGE_QUERY, { start, end })
    .catch(() => []);

  return { posts, totalCount, pageNumber, totalPages };
}
