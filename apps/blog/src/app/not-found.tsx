import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import { SearchForm } from "@/components/common/search-form";
import { CategoryChips } from "@/components/category/category-chips";
import { RfqCta } from "@/components/common/rfq-cta";
import { CtaNewsletter } from "@/components/common/cta-newsletter";
import { PostList } from "@/components/post/post-list";
import { toPostCardDataListFromPopular } from "@/lib/post-card-data";
import { fetchBlogCategories, fetchPopularPostsThisMonth } from "@/lib/blog-data";
import {
  getBlogRobotsDirective,
  robotsDirectiveToMetadata,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Page not found | PakFactory Blog",
  description: "This page does not exist. Search the blog or browse categories.",
  robots: robotsDirectiveToMetadata(getBlogRobotsDirective({ kind: "error" })),
};

export default async function NotFound() {
  const [categories, popularPosts] = await Promise.all([
    fetchBlogCategories(),
    fetchPopularPostsThisMonth(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          We could not find that page
        </h1>
        <p className="text-muted-foreground">
          The link may be outdated or the URL was mistyped. Search below or pick a
          category to keep reading.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to Blog Home</Link>
        </Button>
      </header>

      <div className="mt-10 space-y-10">
        <SearchForm />
        <CategoryChips categories={categories} />
        <PostList
          posts={toPostCardDataListFromPopular(popularPosts)}
          variant="rail"
          layout="list"
          heading="Popular this month"
          headingId="popular-posts-heading"
        />
        <RfqCta />
        <CtaNewsletter />
      </div>
    </main>
  );
}
