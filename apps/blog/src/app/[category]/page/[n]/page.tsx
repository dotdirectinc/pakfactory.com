import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CategoryArchiveView } from "@/components/views/category-archive-view";
import { parsePerPage } from "@/lib/blog-archive";
import {
  buildCategoryArchiveMetadata,
  categoryPageHref,
  fetchCategoryArchivePage,
  fetchCategoryBySlug,
  getCategoryListingRobots,
  parseCategoryFilters,
} from "@/lib/blog-category-archive";
import {
  isArchivePageOutOfRange,
  paginatedEntityDescription,
  paginatedListTitle,
  resolvePaginationRoute,
} from "@/lib/blog-archive-pagination";
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
    pagination.status === "not-found" ||
    pagination.status === "redirect"
  ) {
    return { title: "Category | PakFactory Blog" };
  }

  const sp = await searchParams;
  const filters = parseCategoryFilters(sp);
  // Metadata only needs the category doc — avoid re-running the full archive
  // fetch here (the page render does that). `fetchCategoryBySlug` is cache()'d,
  // so this shares one doc fetch with the render below.
  const categoryDoc = await fetchCategoryBySlug(category);
  if (!categoryDoc) return { title: "Category not found" };

  return buildCategoryArchiveMetadata(
    categoryDoc,
    categoryPageHref(category, pagination.pageNumber, filters),
    getCategoryListingRobots(pagination.pageNumber, sp),
    {
      titleOverride: paginatedListTitle(
        categoryDoc.title,
        pagination.pageNumber,
      ),
      descriptionOverride: paginatedEntityDescription(
        categoryDoc.title,
        categoryDoc.descriptionText,
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

  const pagination = resolvePaginationRoute(raw, categoryHref(category));
  if (pagination.status === "not-found") notFound();
  if (pagination.status === "redirect") redirect(pagination.href);

  const sp = await searchParams;
  const filters = parseCategoryFilters(sp);
  const perPage = parsePerPage(sp.perPage);
  const data = await fetchCategoryArchivePage(
    category,
    pagination.pageNumber,
    filters,
    perPage,
  );

  if (!data) notFound();
  if (isArchivePageOutOfRange(pagination.pageNumber, data.totalCount, perPage)) {
    notFound();
  }

  return <CategoryArchiveView data={data} />;
}
