import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostArticle } from "@/app/_components/blog-post-article";
import {
  buildPostJsonLd,
  buildPostMetadata,
  fetchPostByCategoryAndSlug,
} from "@/lib/blog-post";
import { isKnownCategorySlug } from "@/lib/blog-categories";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string; postSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: categorySlug, postSlug } = await params;
  if (!isKnownCategorySlug(categorySlug)) {
    return { title: "Post not found" };
  }

  const post = await fetchPostByCategoryAndSlug(categorySlug, postSlug);
  if (!post) return { title: "Post not found" };

  return buildPostMetadata(post);
}

export default async function CategoryPostPage({ params }: PageProps) {
  const { slug: categorySlug, postSlug } = await params;

  if (!isKnownCategorySlug(categorySlug)) notFound();

  const post = await fetchPostByCategoryAndSlug(categorySlug, postSlug);
  if (!post) notFound();

  const jsonLd = buildPostJsonLd(post);

  return <BlogPostArticle post={post} jsonLd={jsonLd} />;
}
