import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/post/post-article";
import { CategoryArchiveView } from "@/components/category/category-archive-view";
import {
  categoryPageHref,
  fetchCategoryArchivePage,
  getCategoryListingRobots,
  parseCategoryFilters,
} from "@/lib/blog-category-archive";
import { isKnownCategorySlug } from "@/lib/blog-categories";
import {
  buildPostJsonLd,
  buildPostMetadata,
  fetchPostBySlug,
} from "@/lib/blog-post";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { redirectOrNotFound } from "@/lib/blog-redirects";

export const revalidate = 60;

/**
 * Single root dynamic segment, resolved in order:
 *   1. known category slug  → category archive (`/{category}`)
 *   2. otherwise            → blog post by slug (`/{slug}`, the canonical post URL)
 *   3. neither              → notFound()
 * Reserved/physical routes (`/all`, `/tag`, `/rss.xml`, `/sitemap.xml`, `/api`)
 * are matched by Next before this dynamic segment.
 */
type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { category } = await params;

  if (isKnownCategorySlug(category)) {
    const sp = await searchParams;
    const filters = parseCategoryFilters(sp);
    const data = await fetchCategoryArchivePage(category, 1, filters);
    if (!data) return { title: "Category not found" };

    const canonical = absoluteUrl(categoryPageHref(category, 1, filters));
    const title =
      data.category.metaTitle?.trim() ||
      `${data.category.title} | PakFactory Blog`;
    const description =
      data.category.metaDescription?.trim() ||
      data.category.descriptionText?.trim().slice(0, 160) ||
      `Browse ${data.category.title} articles on PakFactory Blog.`;

    return {
      title,
      description,
      robots: robotsDirectiveToMetadata(getCategoryListingRobots(1, sp)),
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        ...(data.category.ogImageUrl ? { images: [{ url: data.category.ogImageUrl }] } : {}),
      },
      twitter: {
        card: data.category.ogImageUrl ? "summary_large_image" : "summary",
        title,
        description,
        ...(data.category.ogImageUrl ? { images: [data.category.ogImageUrl] } : {}),
      },
    };
  }

  const post = await fetchPostBySlug(category);
  if (post) return buildPostMetadata(post);
  return { title: "Not found" };
}

export default async function CategoryOrPostPage({
  params,
  searchParams,
}: PageProps) {
  const { category } = await params;

  if (isKnownCategorySlug(category)) {
    const sp = await searchParams;
    const filters = parseCategoryFilters(sp);
    const data = await fetchCategoryArchivePage(category, 1, filters);
    if (!data) notFound();
    return <CategoryArchiveView data={data} />;
  }

  const post = await fetchPostBySlug(category);
  if (post) {
    const jsonLd = buildPostJsonLd(post);
    return <PostArticle post={post} jsonLd={jsonLd} />;
  }

  // Neither a category nor a live post — apply a CMS redirect if one exists
  // (e.g. an old slug that moved), otherwise render the 404.
  return redirectOrNotFound(`/${category}`);
}
