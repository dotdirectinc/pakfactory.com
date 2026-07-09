import { cache } from "react";
import {
  fetchCategoryArchivePage,
  parseCategoryFilters,
  type CategoryArchivePageData,
} from "@/lib/blog-category-archive";
import { fetchBlogPageBySlug, type BlogPageRecord } from "@/lib/blog-page";
import { fetchPostBySlug, type BlogPostDetail } from "@/lib/blog-post";

export type SegmentResolution =
  | { kind: "category"; data: CategoryArchivePageData }
  | { kind: "blogPage"; data: BlogPageRecord }
  | { kind: "post"; data: BlogPostDetail }
  | { kind: "notFound" };

type SearchParams = Record<string, string | string[] | undefined>;

const cachedFetchCategoryArchivePage = cache(fetchCategoryArchivePage);
const cachedFetchBlogPageBySlug = cache(fetchBlogPageBySlug);
const cachedFetchPostBySlug = cache(fetchPostBySlug);

/**
 * ADR-009 root segment resolver: category → blogPage → post → notFound.
 * Fetchers are React-cached so generateMetadata and the page share one request.
 */
export async function resolveBlogSegment(
  segment: string,
  options?: {
    searchParams?: SearchParams;
    page?: number;
  },
): Promise<SegmentResolution> {
  const page = options?.page ?? 1;
  const filters = parseCategoryFilters(options?.searchParams ?? {});

  const categoryData = await cachedFetchCategoryArchivePage(segment, page, filters);
  if (categoryData) return { kind: "category", data: categoryData };

  const cmsPage = await cachedFetchBlogPageBySlug(segment);
  if (cmsPage) return { kind: "blogPage", data: cmsPage };

  const post = await cachedFetchPostBySlug(segment);
  if (post) return { kind: "post", data: post };

  return { kind: "notFound" };
}
