"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { AuthorPostCard, AuthorPostsResult } from "@/lib/blog-author";
import { postDetailHref } from "@/lib/blog-post-url";

type AuthorPostsLoaderProps = {
  authorSlug: string;
  initialPosts: AuthorPostCard[];
  initialHasMore: boolean;
};

function PostTile({ post }: { post: AuthorPostCard }) {
  return (
    <article className="space-y-2">
      <Link href={postDetailHref(post.slug)} className="group block">
        {post.imageUrl && (
          <div className="relative mb-2 aspect-[16/10] overflow-hidden rounded-md bg-muted">
            <Image
              src={post.imageUrl}
              alt=""
              fill
              className="object-cover transition-transform group-hover:scale-[1.02]"
              sizes="(max-width: 1024px) 50vw, 320px"
            />
          </div>
        )}
        <h3 className="text-lg font-semibold group-hover:underline">{post.title}</h3>
        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {post.categoryTitle}
          {post.publishedAt &&
            ` · ${new Date(post.publishedAt).toLocaleDateString()}`}
        </p>
      </Link>
    </article>
  );
}

export function AuthorPostsLoader({
  authorSlug,
  initialPosts,
  initialHasMore,
}: AuthorPostsLoaderProps) {
  const [posts, setPosts] = useState<AuthorPostCard[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadMore = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/author/${encodeURIComponent(authorSlug)}/posts?offset=${posts.length}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AuthorPostsResult = await res.json();
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        return [...prev, ...data.posts.filter((p) => !seen.has(p._id))];
      });
      setHasMore(data.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authorSlug, posts.length]);

  if (posts.length === 0) {
    return <p className="text-muted-foreground">No posts yet from this author.</p>;
  }

  return (
    <div>
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <li key={post._id}>
            <PostTile post={post} />
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border border-input bg-background px-5 py-2 text-sm font-medium shadow-xs hover:bg-muted disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load More (12)"}
          </button>
          {error && (
            <p className="text-sm text-destructive">
              Couldn’t load more — try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
