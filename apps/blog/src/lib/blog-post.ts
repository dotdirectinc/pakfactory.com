import type { Metadata } from "next";
import {
  blogPosting,
  breadcrumbList,
  jsonLdGraph,
  organization,
  person,
  serializeJsonLd,
} from "@pakfactory/seo";
import { authorHref, categoryHref, postDetailHref } from "@/lib/blog-post-url";
import { authorPersonId } from "@/lib/author-jsonld";
import { absoluteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";
import { getPreviewableSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { sanityImageUrl } from "@/lib/sanity-image";
import {
  getBlogRobotsDirective,
  robotsDirectiveToMetadata,
} from "@/lib/seo";
import {
  POST_BY_CATEGORY_AND_SLUG_QUERY,
  POST_BY_SLUG_QUERY,
} from "@pakfactory/sanity/queries";

export type BlogPostDetail = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  mainImage?: unknown;
  categorySlug?: string;
  categoryTitle?: string;
  author?: {
    name?: string;
    slug?: string | null;
    photo?: unknown;
  };
  body?: unknown;
};

export function postCanonicalUrl(post: BlogPostDetail): string {
  return absoluteUrl(postDetailHref(post.slug, post.categorySlug));
}

export async function fetchPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  if (!isSanityConfigured()) return null;
  const client = await getPreviewableSanityClient();
  return client
    .fetch<BlogPostDetail | null>(POST_BY_SLUG_QUERY, { slug })
    .catch(() => null);
}

export async function fetchPostByCategoryAndSlug(
  categorySlug: string,
  postSlug: string,
): Promise<BlogPostDetail | null> {
  if (!isSanityConfigured()) return null;
  const client = await getPreviewableSanityClient();
  return client
    .fetch<BlogPostDetail | null>(POST_BY_CATEGORY_AND_SLUG_QUERY, {
      categorySlug,
      postSlug,
    })
    .catch(() => null);
}

export function buildPostMetadata(post: BlogPostDetail): Metadata {
  const postUrl = postCanonicalUrl(post);
  const description = post.excerpt?.trim();
  const imageUrl = sanityImageUrl(post.mainImage);

  return {
    title: post.title,
    ...(description ? { description } : {}),
    robots: robotsDirectiveToMetadata(getBlogRobotsDirective({ kind: "post" })),
    alternates: { canonical: postUrl },
    openGraph: {
      title: post.title,
      ...(description ? { description } : {}),
      url: postUrl,
      type: "article",
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: post.title,
      ...(description ? { description } : {}),
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export function buildPostJsonLd(post: BlogPostDetail): string {
  const wwwUrl = normalizeSiteUrl(getWwwUrl());
  const postUrl = postCanonicalUrl(post);
  const orgId = `${wwwUrl}#organization`;
  // Reference the author's profile-page Person node (PROD-1501) so every post's
  // Article.author links back to /author/{slug}; fall back to a per-post node.
  const authorSlug = post.author?.slug ?? undefined;
  const authorPageUrl = authorSlug ? absoluteUrl(authorHref(authorSlug)) : undefined;
  const authorId = authorSlug ? authorPersonId(authorSlug) : `${postUrl}#author`;

  const org = organization({
    name: "PakFactory",
    url: wwwUrl,
    id: orgId,
  });

  const mainImageUrl = sanityImageUrl(post.mainImage);
  const authorImageUrl = post.author
    ? sanityImageUrl(post.author.photo)
    : undefined;

  const authorNode =
    post.author?.name != null && post.author.name !== ""
      ? person({
          id: authorId,
          name: post.author.name,
          ...(authorPageUrl ? { url: authorPageUrl } : {}),
          image: authorImageUrl,
        })
      : null;

  const publisherRef = { "@id": orgId };
  const authorRef =
    authorNode !== null ? { "@id": authorId } : undefined;

  const article = blogPosting({
    id: postUrl,
    url: postUrl,
    headline: post.title,
    datePublished: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : undefined,
    ...(mainImageUrl ? { image: mainImageUrl } : {}),
    ...(authorRef ? { author: authorRef } : {}),
    publisher: publisherRef,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  });

  const crumbs = breadcrumbList([
    { name: "Blog", url: absoluteUrl("/") },
    ...(post.categorySlug && post.categoryTitle
      ? [
          {
            name: post.categoryTitle,
            url: absoluteUrl(categoryHref(post.categorySlug)),
          },
        ]
      : []),
    { name: post.title, url: postUrl },
  ]);

  const nodes: Record<string, unknown>[] = [org];
  if (authorNode) nodes.push(authorNode);
  nodes.push(article, crumbs);

  return serializeJsonLd(jsonLdGraph(nodes));
}
