import { notFound } from "next/navigation";
import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import { POST_BY_SLUG_QUERY } from "@pakfactory/sanity/queries";

type Post = {
  _id: string;
  title: string;
  slug: string;
  publishedAt?: string;
  author?: { name?: string };
  body?: unknown;
};

export const revalidate = 60;

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = isSanityConfigured()
    ? await getSanityClient()
        .fetch<Post | null>(POST_BY_SLUG_QUERY, { slug })
        .catch(() => null)
    : null;

  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <article>
        <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {post.author?.name}
          {post.publishedAt &&
            ` · ${new Date(post.publishedAt).toLocaleDateString()}`}
        </p>
      </article>
    </main>
  );
}
