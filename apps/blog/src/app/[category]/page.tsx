import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CategoryArchiveView } from "@/components/views/category-archive-view";
import {
  categoryPageHref,
  fetchCategoryArchivePage,
  getCategoryListingRobots,
  parseCategoryFilters,
} from "@/lib/blog-category-archive";
import { isKnownCategorySlug } from "@/lib/blog-categories";
import { categoryHref } from "@/lib/blog-post-url";
import {
  buildPostJsonLd,
  buildPostMetadata,
  fetchPostBySlug,
} from "@/lib/blog-post";
import {
  buildBlogPageMetadata,
  fetchBlogPageBySlug,
} from "@/lib/blog-page";
import { BlogLandingView } from "@/components/views/blog-landing-view";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { redirectOrNotFound } from "@/lib/blog-redirects";

export const revalidate = 60;

/**
 * Single root dynamic segment, resolved in order:
 *   1. known category slug  → category archive (`/{category}`)
 *   2. published blogPage   → CMS landing/static (`/{slug}`, ADR-009)
 *   3. otherwise            → blog post by slug (`/{slug}`, the canonical post URL)
 *   4. neither              → redirect map or notFound()
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

  const cmsPage = await fetchBlogPageBySlug(category);
  if (cmsPage) return buildBlogPageMetadata(cmsPage);

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

  const cmsPage = await fetchBlogPageBySlug(category);
  if (cmsPage) {
    return <BlogLandingView page={cmsPage} />;
  }

  const post = await fetchPostBySlug(category);
  if (post) {
    const jsonLd = buildPostJsonLd(post);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
        <main className="mx-auto max-w-3xl px-6 py-12">
          <nav className="mb-8 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Blog
            </Link>
            {post.categorySlug && post.categoryTitle && (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={categoryHref(post.categorySlug)}
                  className="hover:text-foreground"
                >
                  {post.categoryTitle}
                </Link>
              </>
            )}
          </nav>
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

  // Neither a category nor a live post — apply a CMS redirect if one exists
  // (e.g. an old slug that moved), otherwise render the 404.
  return redirectOrNotFound(`/${category}`);
}
