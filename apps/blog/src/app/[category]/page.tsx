import type { Metadata } from "next";
import { CategoryArchiveView } from "@/components/views/category-archive-view";
import { PostDetailView } from "@/components/views/post-detail-view";
import { BlogLandingView } from "@/components/views/blog-landing-view";
import {
  buildCategoryArchiveMetadata,
  categoryPageHref,
  getCategoryListingRobots,
  parseCategoryFilters,
  parseCategoryPageFromSearchParams,
  parsePerPage,
} from "@/lib/blog-category-archive";
import {
  buildPostJsonLd,
  buildPostMetadata,
} from "@/lib/blog-post";
import { buildBlogPageMetadata } from "@/lib/blog-page";
import { redirectOrNotFound } from "@/lib/blog-redirects";
import { resolveBlogSegment } from "@/lib/blog-segment-resolver";

export const revalidate = 60;

/**
 * Root dynamic segment at `/{category}` — folder name reflects the primary
 * route (category archive); resolution also handles CMS landings and posts (ADR-009):
 *   1. known category slug  → category archive
 *   2. published blogPage   → CMS landing/static
 *   3. otherwise            → blog post by slug
 *   4. neither              → redirect map or notFound()
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
  const sp = await searchParams;
  const page = parseCategoryPageFromSearchParams(sp);
  const perPage = parsePerPage(sp.perPage);
  const resolution = await resolveBlogSegment(category, { searchParams: sp, page, perPage });

  switch (resolution.kind) {
    case "category": {
      const filters = parseCategoryFilters(sp);
      return buildCategoryArchiveMetadata(
        resolution.data.category,
        categoryPageHref(category, 1, filters),
        getCategoryListingRobots(1, sp),
      );
    }
    case "blogPage":
      return await buildBlogPageMetadata(resolution.data);
    case "post":
      return buildPostMetadata(resolution.data);
    case "notFound":
      return { title: "Not found" };
  }
}

export default async function CategoryRootPage({
  params,
  searchParams,
}: PageProps) {
  const { category } = await params;
  const sp = await searchParams;
  const page = parseCategoryPageFromSearchParams(sp);
  const perPage = parsePerPage(sp.perPage);
  const resolution = await resolveBlogSegment(category, { searchParams: sp, page, perPage });

  switch (resolution.kind) {
    case "category":
      return <CategoryArchiveView data={resolution.data} />;
    case "blogPage":
      return <BlogLandingView page={resolution.data} />;
    case "post": {
      const jsonLd = await buildPostJsonLd(resolution.data);
      return (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd }}
          />
          <PostDetailView post={resolution.data} />
        </>
      );
    }
    case "notFound":
      return redirectOrNotFound(`/${category}`);
  }
}
