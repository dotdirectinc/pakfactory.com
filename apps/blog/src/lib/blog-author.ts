import type { Metadata } from "next";
import type { PortableTextBlock } from "@portabletext/types";
import type { PostCardData } from "@/components/modules/post-card";
import type { HomePostCard } from "@/lib/blog-home";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import { toPostCardData } from "@/lib/post-card-data";
import {
  buildDocMetadata,
  type DocSeoFields,
} from "@/lib/resolve-seo";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { getBlogRobotsDirective, type BlogRobotsDirective } from "@/lib/seo";
import { sanityImageUrl } from "@/lib/sanity-image";
import { authorHref } from "@/lib/blog-post-url";
import {
  AUTHOR_BY_SLUG_QUERY,
  AUTHOR_POSTS_COUNT_QUERY,
  AUTHOR_POSTS_PAGE_QUERY,
} from "@pakfactory/sanity/queries";

/** Posts shown per "page" (initial SSR batch and each Load More click). */
export const AUTHOR_PAGE_SIZE = 12;

export type AuthorPostsResult = { posts: PostCardData[]; hasMore: boolean };

export type AuthorDoc = DocSeoFields & {
  _id?: string;
  name: string;
  slug: string;
  role?: string;
  tagline?: string;
  shortBio?: string;
  authorType?: "staff" | "guest";
  bio?: PortableTextBlock[];
  /** Plain-text bio (`pt::text`) for the Person schema description. */
  bioText?: string;
  socialLinks?: string[];
  photo?: unknown;
};

export async function buildAuthorMetadata(
  author: AuthorDoc,
  robots: BlogRobotsDirective = getBlogRobotsDirective({ kind: "author" }),
): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "authorDefaults");
  const photoUrl = sanityImageUrl(author.photo, 400);

  return buildDocMetadata({
    title: author.name,
    descriptionFallback:
      author.shortBio?.trim() ||
      author.bioText?.trim().slice(0, 160) ||
      author.role ||
      `Articles by ${author.name} on PakFactory Blog.`,
    featuredImageUrl: photoUrl,
    selfCanonicalPath: authorHref(author.slug),
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: author,
    robots,
    openGraphType: "profile",
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      name: author.name,
      job_title: author.role,
      shortBio: author.shortBio || author.bioText,
      sitename: ctx.siteName,
    },
  });
}

export async function fetchAuthorBySlug(slug: string): Promise<AuthorDoc | null> {
  if (!isSanityConfigured()) return null;
  const client = await getSanityClient();
  const doc = await client
    .fetch<AuthorDoc | null>(AUTHOR_BY_SLUG_QUERY, { slug })
    .catch(() => null);
  return doc?.slug ? doc : null;
}

export async function fetchAuthorPostsCount(authorSlug: string): Promise<number> {
  if (!isSanityConfigured()) return 0;
  const client = await getSanityClient();
  return client
    .fetch<number>(AUTHOR_POSTS_COUNT_QUERY, blogLanguageParams({ authorSlug }))
    .catch(() => 0);
}

/** Author posts slice, newest first — `start` inclusive, `end` exclusive. */
export async function fetchAuthorPosts(
  authorSlug: string,
  start: number,
  end: number,
): Promise<HomePostCard[]> {
  if (!isSanityConfigured()) return [];
  const client = await getSanityClient();
  return client
    .fetch<HomePostCard[]>(
      AUTHOR_POSTS_PAGE_QUERY,
      blogLanguageParams({ authorSlug, start, end }),
    )
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
