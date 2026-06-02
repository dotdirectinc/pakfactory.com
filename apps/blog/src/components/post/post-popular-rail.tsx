import Link from "next/link";
import type { PopularPostCard } from "@/lib/blog-data";
import { postDetailHref } from "@/lib/blog-post-url";

type PostPopularRailProps = {
  posts: PopularPostCard[];
  title?: string;
  className?: string;
};

/** Server rail for 404 / search zero-results (PROD-1506, PROD-1503). */
export function PostPopularRail({
  posts,
  title = "Popular this month",
  className,
}: PostPopularRailProps) {
  if (posts.length === 0) return null;

  return (
    <section className={className} aria-labelledby="popular-posts-heading">
      <h2 id="popular-posts-heading" className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <ul className="mt-4 space-y-4">
        {posts.map((post) => (
          <li key={post._id}>
            <Link
              href={postDetailHref(post.slug, post.categorySlug)}
              className="group block"
            >
              <span className="font-medium group-hover:underline">{post.title}</span>
              {post.excerpt && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {post.excerpt}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
