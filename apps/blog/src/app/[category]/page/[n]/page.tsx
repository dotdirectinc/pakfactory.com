import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CategoryArchiveView } from "@/components/views/category-archive-view";
import {
  buildCategoryArchiveMetadata,
  categoryPageHref,
  fetchCategoryArchivePage,
  getCategoryListingRobots,
  parseCategoryFilters,
} from "@/lib/blog-category-archive";
import {
  isArchivePageOutOfRange,
  paginatedEntityDescription,
  paginatedListTitle,
  resolvePaginationRoute,
} from "@/lib/blog-archive-pagination";
import { isKnownCategorySlug } from "@/lib/blog-categories";
import { categoryHref } from "@/lib/blog-post-url";

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
  const pagination = resolvePaginationRoute(raw, categoryHref(category));
  if (
    !isKnownCategorySlug(category) ||
    pagination.status === "not-found" ||
    pagination.status === "redirect"
  ) {
    return { title: "Category | PakFactory Blog" };
  }

  const sp = await searchParams;
  const filters = parseCategoryFilters(sp);
  const data = await fetchCategoryArchivePage(
    category,
    pagination.pageNumber,
    filters,
  );
  if (!data) return { title: "Category not found" };

  return buildCategoryArchiveMetadata(
    data.category,
    categoryPageHref(category, pagination.pageNumber, filters),
    getCategoryListingRobots(pagination.pageNumber, sp),
    {
      titleOverride: paginatedListTitle(
        data.category.title,
        pagination.pageNumber,
      ),
      descriptionOverride: paginatedEntityDescription(
        data.category.title,
        data.category.descriptionText,
        pagination.pageNumber,
      ),
    },
  );
}

export default async function CategoryArchivePaginatedPage({
  params,
  searchParams,
}: PageProps) {
  const { category, n: raw } = await params;

  if (!isKnownCategorySlug(category)) notFound();

  const pagination = resolvePaginationRoute(raw, categoryHref(category));
  if (pagination.status === "not-found") notFound();
  if (pagination.status === "redirect") redirect(pagination.href);

  const sp = await searchParams;
  const filters = parseCategoryFilters(sp);
  const data = await fetchCategoryArchivePage(
    category,
    pagination.pageNumber,
    filters,
  );

  if (!data) notFound();
  if (isArchivePageOutOfRange(pagination.pageNumber, data.totalCount)) {
    notFound();
  }

  return <CategoryArchiveView data={data} />;
}
