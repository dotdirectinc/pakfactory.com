import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CategoryArchiveView } from "@/components/category/category-archive-view";
import {
  categoryPageHref,
  fetchCategoryArchivePage,
  getCategoryListingRobots,
  isArchivePageOutOfRange,
  parseArchivePageParam,
  parseCategoryFilters,
} from "@/lib/blog-category-archive";
import { isKnownCategorySlug } from "@/lib/blog-categories";
import { categoryHref } from "@/lib/blog-post-url";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ category: string; n: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { category, n: raw } = await params;
  const pageNumber = parseArchivePageParam(raw);
  if (!isKnownCategorySlug(category) || pageNumber === null || pageNumber === 1) {
    return { title: "Category | PakFactory Blog" };
  }

  const sp = await searchParams;
  const filters = parseCategoryFilters(sp);
  const data = await fetchCategoryArchivePage(category, pageNumber, filters);
  if (!data) return { title: "Category not found" };

  const canonical = absoluteUrl(categoryPageHref(category, pageNumber, filters));
  const title = `${data.category.title} — Page ${pageNumber} | PakFactory Blog`;
  const description =
    data.category.metaDescription?.trim() ||
    data.category.descriptionText?.trim().slice(0, 160) ||
    `Page ${pageNumber} of ${data.category.title} on PakFactory Blog.`;

  return {
    title,
    description,
    robots: robotsDirectiveToMetadata(getCategoryListingRobots(pageNumber, sp)),
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryArchivePaginatedPage({
  params,
  searchParams,
}: PageProps) {
  const { category, n: raw } = await params;
  const pageNumber = parseArchivePageParam(raw);

  if (!isKnownCategorySlug(category)) notFound();
  if (pageNumber === null) notFound();
  if (pageNumber === 1) redirect(categoryHref(category));

  const sp = await searchParams;
  const filters = parseCategoryFilters(sp);
  const data = await fetchCategoryArchivePage(category, pageNumber, filters);

  if (!data) notFound();
  if (isArchivePageOutOfRange(pageNumber, data.totalCount)) notFound();

  return <CategoryArchiveView data={data} />;
}
