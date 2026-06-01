import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import { BlogSearchForm } from "@/components/shared/blog-search-form";
import { CategoryChips } from "@/components/category/category-chips";
import { GlobalRfqCta } from "@/components/shared/global-rfq-cta";
import { NewsletterCtaBand } from "@/components/shared/newsletter-cta-band";
import { PopularPostsRail } from "@/components/post/popular-posts-rail";
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
        <BlogSearchForm />
        <CategoryChips categories={categories} />
        <PopularPostsRail posts={popularPosts} />
        <GlobalRfqCta />
        <NewsletterCtaBand />
      </div>
    </main>
  );
}
