"use client";

import { useCallback, useState } from "react";
import type { PostCardData } from "@/components/modules/post-card";
import { PostList } from "@/components/modules/post-list";
import type { AuthorPostsResult } from "@/lib/blog-author";

type AuthorPostsLoaderProps = {
  authorSlug: string;
  initialPosts: PostCardData[];
  initialHasMore: boolean;
};

export function AuthorPostsLoader({
  authorSlug,
  initialPosts,
  initialHasMore,
}: AuthorPostsLoaderProps) {
  const [posts, setPosts] = useState<PostCardData[]>(initialPosts);
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

  return (
    <div>
      <PostList
        posts={posts}
        columns={3}
        emptyMessage="No posts yet from this author."
      />

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
              Couldn&apos;t load more — try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
