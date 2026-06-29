import type { Metadata } from "next";
import type { PortableTextBlock } from "@portabletext/types";
import {
  blogPosting,
  breadcrumbList,
  faqPage,
  jsonLdGraph,
  newsArticle,
  organization,
  person,
  serializeJsonLd,
} from "@pakfactory/seo";
import type { HomePostCard } from "@/lib/blog-home";
import { authorHref, categoryHref, postDetailHref } from "@/lib/blog-post-url";
import { authorPersonId } from "@/lib/author-jsonld";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import { absoluteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { sanityImageUrl } from "@/lib/sanity-image";
import { getBlogRobotsDirective } from "@/lib/seo";
import { buildDocMetadata, type DocSeoFields } from "@/lib/resolve-seo";
import {
  POST_BY_CATEGORY_AND_SLUG_QUERY,
  POST_BY_SLUG_QUERY,
} from "@pakfactory/sanity/queries";

const PACKAGING_NEWS_CATEGORY_SLUG = "packaging-news";

export type PostFaqItem = {
  question?: string;
  answer?: PortableTextBlock[];
  answerText?: string;
};

export type PostTag = {
  _id?: string;
  title: string;
  slug: string;
  tagGroup?: string;
};

export type PostBodyWidget = {
  widgetType?: string;
  headline?: string;
  subtext?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  variant?: string;
  productTitle?: string;
  productSlug?: string;
  productExcerpt?: string;
};

export type PostBodyCallout = {
  calloutTone?: string;
  calloutTitle?: string;
  calloutBody?: PortableTextBlock[];
};

export type BlogPostDetail = DocSeoFields & {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  lastModified?: string | null;
  mainImage?: unknown;
  categorySlug?: string;
  categoryTitle?: string;
  readingTimeMinutes?: number | null;
  tags?: PostTag[];
  author?: {
    name?: string;
    slug?: string | null;
    photo?: unknown;
    role?: string;
    tagline?: string;
    shortBio?: string;
  };
  body?: PortableTextBlock[];
  tldr?: PortableTextBlock[];
  tldrText?: string;
  faqItems?: PostFaqItem[];
  relatedPosts?: HomePostCard[];
};

export function postCanonicalUrl(post: BlogPostDetail): string {
  return absoluteUrl(postDetailHref(post.slug, post.categorySlug));
}

export async function fetchPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  if (!isSanityConfigured()) return null;
  const client = await getSanityClient();
  return client
    .fetch<BlogPostDetail | null>(POST_BY_SLUG_QUERY, blogLanguageParams({ slug }))
    .catch(() => null);
}

export async function fetchPostByCategoryAndSlug(
  categorySlug: string,
  postSlug: string,
): Promise<BlogPostDetail | null> {
  if (!isSanityConfigured()) return null;
  const client = await getSanityClient();
  return client
    .fetch<BlogPostDetail | null>(
      POST_BY_CATEGORY_AND_SLUG_QUERY,
      blogLanguageParams({ categorySlug, postSlug }),
    )
    .catch(() => null);
}

export async function buildPostMetadata(post: BlogPostDetail): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "postDefaults");
  const featuredImageUrl = sanityImageUrl(post.mainImage);

  return buildDocMetadata({
    title: post.title,
    descriptionFallback: post.excerpt,
    featuredImageUrl,
    selfCanonicalPath: postDetailHref(post.slug, post.categorySlug),
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: post,
    robots: getBlogRobotsDirective({ kind: "post" }),
    openGraphType: "article",
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      title: post.title,
      excerpt: post.excerpt,
      sitename: ctx.siteName,
    },
  });
}

export async function buildPostJsonLd(post: BlogPostDetail): Promise<string> {
  const ctx = await fetchSeoContext();
  const wwwUrl = normalizeSiteUrl(getWwwUrl());
  const postUrl = postCanonicalUrl(post);
  const orgId = `${wwwUrl}#organization`;
  const authorSlug = post.author?.slug ?? undefined;
  const authorPageUrl = authorSlug ? absoluteUrl(authorHref(authorSlug)) : undefined;
  const authorId = authorSlug ? authorPersonId(authorSlug) : `${postUrl}#author`;

  const org = organization({
    name: "PakFactory",
    url: wwwUrl,
    id: orgId,
    ...(ctx.organizationLogoUrl ? { logo: ctx.organizationLogoUrl } : {}),
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

  const dateModifiedSource = post.lastModified ?? post.publishedAt;
  const description =
    post.tldrText?.trim() || post.excerpt?.trim() || undefined;

  const articleInput = {
    id: postUrl,
    url: postUrl,
    headline: post.title,
    description,
    datePublished: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : undefined,
    dateModified: dateModifiedSource
      ? new Date(dateModifiedSource).toISOString()
      : undefined,
    ...(mainImageUrl ? { image: mainImageUrl } : {}),
    ...(authorRef ? { author: authorRef } : {}),
    publisher: publisherRef,
    mainEntityOfPage: {
      "@type": "WebPage" as const,
      "@id": postUrl,
    },
  };

  const article =
    post.categorySlug === PACKAGING_NEWS_CATEGORY_SLUG
      ? newsArticle(articleInput)
      : blogPosting(articleInput);

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

  const faqItems = (post.faqItems ?? [])
    .filter((item) => item.question?.trim() && item.answerText?.trim())
    .map((item) => ({
      question: item.question!.trim(),
      answer: item.answerText!.trim(),
    }));

  if (faqItems.length > 0) {
    nodes.push(
      faqPage({
        id: `${postUrl}#faq`,
        items: faqItems,
      }),
    );
  }

  return serializeJsonLd(jsonLdGraph(nodes));
}
