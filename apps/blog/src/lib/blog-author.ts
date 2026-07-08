import type { Metadata } from "next";
import type { PortableTextBlock } from "@portabletext/types";
import type { SocialLink } from "@pakfactory/sanity/social-platforms";
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
import {
  archivePageSlice,
  getTotalArchivePages,
  isArchivePageOutOfRange,
} from "@/lib/blog-archive";
import { getBlogRobotsDirective, type BlogRobotsDirective } from "@/lib/seo";
import { sanityImageUrl } from "@/lib/sanity-image";
import { authorHref } from "@/lib/blog-post-url";
import {
  AUTHOR_BY_SLUG_QUERY,
  AUTHOR_POSTS_COUNT_QUERY,
  AUTHOR_POSTS_PAGE_QUERY,
} from "@pakfactory/sanity/queries";

export type AuthorArchivePageData = {
  author: AuthorDoc;
  posts: PostCardData[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
};

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
  socialLinks?: SocialLink[];
  photo?: unknown;
};

export async function buildAuthorMetadata(
  author: AuthorDoc,
  selfCanonicalPath: string,
  robots: BlogRobotsDirective = getBlogRobotsDirective({ kind: "author" }),
  options?: { titleOverride?: string; descriptionOverride?: string },
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
    selfCanonicalPath,
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: author,
    robots,
    openGraphType: "profile",
    titleOverride: options?.titleOverride,
    descriptionOverride: options?.descriptionOverride,
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

export function authorPageHref(authorSlug: string, pageNumber: number): string {
  return pageNumber <= 1
    ? authorHref(authorSlug)
    : `${authorHref(authorSlug)}/page/${pageNumber}`;
}

export function getAuthorListingRobots(pageNumber: number): BlogRobotsDirective {
  return getBlogRobotsDirective({ kind: "author", pageNumber });
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
 * One page of author archive posts (path-based pagination, shared LISTING_PAGE_SIZE).
 */
export async function fetchAuthorArchivePage(
  authorSlug: string,
  pageNumber: number,
): Promise<AuthorArchivePageData | null> {
  const author = await fetchAuthorBySlug(authorSlug);
  if (!author) return null;

  const totalCount = await fetchAuthorPostsCount(authorSlug);
  const totalPages = getTotalArchivePages(totalCount);

  if (isArchivePageOutOfRange(pageNumber, totalCount)) {
    return {
      author,
      posts: [],
      totalCount,
      pageNumber,
      totalPages,
    };
  }

  const { start, end } = archivePageSlice(pageNumber);
  const rows = await fetchAuthorPosts(authorSlug, start, end);

  return {
    author,
    posts: rows.map((post) => toPostCardData(post)),
    totalCount,
    pageNumber,
    totalPages,
  };
}
