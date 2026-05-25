import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryArchiveView } from "@/app/_components/category-archive-view";
import {
  categoryPageHref,
  fetchCategoryArchivePage,
  getCategoryListingRobots,
  isArchivePageOutOfRange,
  parseCategoryFilters,
} from "@/lib/blog-category-archive";
import { isKnownCategorySlug } from "@/lib/blog-categories";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { getSiteUrl, normalizeSiteUrl } from "@/lib/site";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isKnownCategorySlug(slug)) return { title: "Category not found" };

  const sp = await searchParams;
  const filters = parseCategoryFilters(sp);
  const data = await fetchCategoryArchivePage(slug, 1, filters);
  if (!data) return { title: "Category not found" };

  const siteUrl = normalizeSiteUrl(getSiteUrl());
  const canonical = `${siteUrl}${categoryPageHref(slug, 1, filters)}`;
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

export default async function CategoryArchivePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!isKnownCategorySlug(slug)) notFound();

  const sp = await searchParams;
  const filters = parseCategoryFilters(sp);
  const data = await fetchCategoryArchivePage(slug, 1, filters);

  if (!data) notFound();

  return <CategoryArchiveView data={data} />;
}
