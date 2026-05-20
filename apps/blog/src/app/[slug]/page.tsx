import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  blogPosting,
  breadcrumbList,
  jsonLdGraph,
  organization,
  person,
  serializeJsonLd,
} from "@pakfactory/seo";
import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import { sanityImageUrl } from "@/lib/sanity-image";
import {
  getBlogRobotsDirective,
  robotsDirectiveToMetadata,
} from "@/lib/seo";
import { getSiteUrl, normalizeSiteUrl } from "@/lib/site";
import { POST_BY_SLUG_QUERY } from "@pakfactory/sanity/queries";

type Post = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  mainImage?: unknown;
  author?: {
    name?: string;
    slug?: string | null;
    image?: unknown;
  };
  body?: unknown;
};

export const revalidate = 60;

async function fetchPostBySlug(slug: string): Promise<Post | null> {
  if (!isSanityConfigured()) return null;
  return getSanityClient()
    .fetch<Post | null>(POST_BY_SLUG_QUERY, { slug })
    .catch(() => null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);

  if (!post) {
    return { title: "Post not found" };
  }

  const siteUrl = normalizeSiteUrl(getSiteUrl());
  const postUrl = `${siteUrl}/${post.slug}`;
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

function buildJsonLd(post: Post) {
  const siteUrl = normalizeSiteUrl(getSiteUrl());
  const postUrl = `${siteUrl}/${post.slug}`;
  const orgId = `${siteUrl}#organization`;
  const authorId = `${postUrl}#author`;

  const org = organization({
    name: "PakFactory",
    url: siteUrl,
    id: orgId,
  });

  const mainImageUrl = sanityImageUrl(post.mainImage);
  const authorImageUrl = post.author
    ? sanityImageUrl(post.author.image)
    : undefined;

  const authorNode =
    post.author?.name != null && post.author.name !== ""
      ? person({
          id: authorId,
          name: post.author.name,
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
    { name: "Blog", url: `${siteUrl}/` },
    { name: post.title, url: postUrl },
  ]);

  const nodes: Record<string, unknown>[] = [org];
  if (authorNode) nodes.push(authorNode);
  nodes.push(article, crumbs);

  return serializeJsonLd(jsonLdGraph(nodes));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);

  if (!post) notFound();

  const jsonLd = buildJsonLd(post);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <article>
          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {post.author?.name}
            {post.publishedAt &&
              ` · ${new Date(post.publishedAt).toLocaleDateString()}`}
          </p>
        </article>
      </main>
    </>
  );
}
