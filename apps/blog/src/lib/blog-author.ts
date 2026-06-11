import type { PortableTextBlock } from "@portabletext/types";
import type { PostCardData } from "@/components/post/post-card";
import type { HomePostCard } from "@/lib/blog-home";
import { toPostCardData } from "@/lib/post-card-data";
import { getSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  AUTHOR_BY_SLUG_QUERY,
  AUTHOR_POSTS_COUNT_QUERY,
  AUTHOR_POSTS_PAGE_QUERY,
} from "@pakfactory/sanity/queries";

/** Posts shown per "page" (initial SSR batch and each Load More click). */
export const AUTHOR_PAGE_SIZE = 12;

export type AuthorPostsResult = { posts: PostCardData[]; hasMore: boolean };

export type AuthorDoc = {
  _id?: string;
  name: string;
  slug: string;
  role?: string;
  bio?: PortableTextBlock[];
  /** Plain-text bio (`pt::text`) for the Person schema description. */
  bioText?: string;
  credentials?: PortableTextBlock[];
  linkedIn?: string;
  photo?: unknown;
};

export async function fetchAuthorBySlug(slug: string): Promise<AuthorDoc | null> {
  if (!isSanityConfigured()) return null;
  const doc = await getSanityClient()
    .fetch<AuthorDoc | null>(AUTHOR_BY_SLUG_QUERY, { slug })
    .catch(() => null);
  return doc?.slug ? doc : null;
}

export async function fetchAuthorPostsCount(authorSlug: string): Promise<number> {
  if (!isSanityConfigured()) return 0;
  return getSanityClient()
    .fetch<number>(AUTHOR_POSTS_COUNT_QUERY, { authorSlug })
    .catch(() => 0);
}

/** Author posts slice, newest first — `start` inclusive, `end` exclusive. */
export async function fetchAuthorPosts(
  authorSlug: string,
  start: number,
  end: number,
): Promise<HomePostCard[]> {
  if (!isSanityConfigured()) return [];
  return getSanityClient()
    .fetch<HomePostCard[]>(AUTHOR_POSTS_PAGE_QUERY, { authorSlug, start, end })
    .catch(() => []);
}

/**
 * One page of author posts as client-safe cards + whether more remain.
 * `offset` is the number already shown; returns the next `AUTHOR_PAGE_SIZE`.
 * Used by the SSR page (offset 0) and the Load More API route.
 */
export async function fetchAuthorPostsPage(
  authorSlug: string,
  offset: number,
): Promise<AuthorPostsResult> {
  if (!isSanityConfigured()) return { posts: [], hasMore: false };
  const start = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const end = start + AUTHOR_PAGE_SIZE;
  const [rows, total] = await Promise.all([
    fetchAuthorPosts(authorSlug, start, end),
    fetchAuthorPostsCount(authorSlug),
  ]);
  return {
    posts: rows.map((post) => toPostCardData(post)),
    hasMore: end < total,
  };
}
