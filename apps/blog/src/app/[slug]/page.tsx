import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BlogPostArticle } from "@/app/_components/blog-post-article";
import {
  buildPostJsonLd,
  buildPostMetadata,
  fetchPostBySlug,
} from "@/lib/blog-post";
import { postDetailHref } from "@/lib/blog-post-url";
import { isKnownCategorySlug } from "@/lib/blog-categories";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Reserved top-level segments — not post slugs. */
const RESERVED_SLUGS = new Set(["all", "category", "search", "api", "rss.xml"]);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug) || isKnownCategorySlug(slug)) {
    return { title: "Not found" };
  }

  const post = await fetchPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  return buildPostMetadata(post);
}

export default async function RootPostRedirectPage({ params }: PageProps) {
  const { slug } = await params;

  if (RESERVED_SLUGS.has(slug) || isKnownCategorySlug(slug)) {
    notFound();
  }

  const post = await fetchPostBySlug(slug);
  if (!post) notFound();

  if (post.categorySlug) {
    permanentRedirect(postDetailHref(post.slug, post.categorySlug));
  }

  const jsonLd = buildPostJsonLd(post);
  return <BlogPostArticle post={post} jsonLd={jsonLd} />;
}
