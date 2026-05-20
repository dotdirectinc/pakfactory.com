import type { Metadata } from "next";
import Link from "next/link";
import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import {
  getListingRobotsFromSearchParams,
  robotsDirectiveToMetadata,
} from "@/lib/seo";
import { POSTS_QUERY } from "@pakfactory/sanity/queries";
import { Button } from "@pakfactory/ui/components/button";

type PostListItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  author?: { name?: string };
};

export const revalidate = 60;

const INDEX_TITLE = "PakFactory Blog";
const INDEX_DESCRIPTION = "Packaging insights, guides, and stories.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const directive = getListingRobotsFromSearchParams("blog_index", sp);

  return {
    title: INDEX_TITLE,
    description: INDEX_DESCRIPTION,
    robots: robotsDirectiveToMetadata(directive),
  };
}

export default async function BlogIndex() {
  const posts = isSanityConfigured()
    ? await getSanityClient()
        .fetch<PostListItem[]>(POSTS_QUERY)
        .catch(() => [])
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <Button variant="outline">Subscribe</Button>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">
          No posts yet. Create one in the Studio to see it here.
        </p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post._id} className="border-b pb-6">
              <Link href={`/${post.slug}`} className="group">
                <h2 className="text-2xl font-semibold group-hover:underline">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 text-muted-foreground">{post.excerpt}</p>
                )}
                <p className="mt-3 text-sm text-muted-foreground">
                  {post.author?.name}
                  {post.publishedAt &&
                    ` · ${new Date(post.publishedAt).toLocaleDateString()}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
