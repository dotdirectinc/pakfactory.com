import Link from "next/link";
import Image from "next/image";
import type { HomePostCard } from "@/lib/blog-home";
import { postDetailHref } from "@/lib/blog-post-url";
import { sanityImageUrl } from "@/lib/sanity-image";

type PostCardProps = {
  post: HomePostCard;
  /** When set, links to `/category/{slug}/{postSlug}` (overrides `post.categorySlug`). */
  categorySlug?: string;
  variant?: "default" | "compact" | "featured" | "headline";
};

function formatPostDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export function PostCard({
  post,
  categorySlug: categorySlugProp,
  variant = "default",
}: PostCardProps) {
  const href = postDetailHref(
    post.slug,
    categorySlugProp ?? post.categorySlug,
  );
  const imageUrl = sanityImageUrl(post.mainImage, variant === "featured" ? 900 : 400);
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";
  const isHeadline = variant === "headline";
  const formattedDate = formatPostDate(post.publishedAt);

  if (isHeadline) {
    return (
      <article className="border-b border-border pb-4 last:border-b-0">
        <Link href={href} className="group block space-y-1">
          {formattedDate && (
            <time
              dateTime={post.publishedAt}
              className="text-xs font-semibold uppercase tracking-wide text-primary"
            >
              {formattedDate}
            </time>
          )}
          <h3 className="text-lg font-bold leading-snug tracking-tight group-hover:underline sm:text-xl">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
          )}
        </Link>
      </article>
    );
  }

  return (
    <article className={isFeatured ? "space-y-3" : isCompact ? "space-y-1" : "space-y-2"}>
      <Link href={href} className="group block">
        {imageUrl && (
          <div
            className={
              isFeatured
                ? "relative mb-3 aspect-[16/9] overflow-hidden rounded-lg bg-muted"
                : isCompact
                  ? "hidden"
                  : "relative mb-2 aspect-[16/10] overflow-hidden rounded-md bg-muted"
            }
          >
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover transition-transform group-hover:scale-[1.02]"
              sizes={isFeatured ? "(max-width: 1024px) 100vw, 50vw" : "200px"}
            />
          </div>
        )}
        <h3
          className={
            isFeatured
              ? "text-2xl font-bold tracking-tight group-hover:underline sm:text-3xl"
              : isCompact
                ? "text-sm font-medium leading-snug group-hover:underline"
                : "text-lg font-semibold group-hover:underline"
          }
        >
          {post.title}
        </h3>
        {post.excerpt && !isCompact && (
          <p
            className={
              isFeatured
                ? "mt-2 line-clamp-3 text-muted-foreground"
                : "mt-1 line-clamp-2 text-sm text-muted-foreground"
            }
          >
            {post.excerpt}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {post.categoryTitle}
          {post.authorName && ` · ${post.authorName}`}
          {post.publishedAt &&
            ` · ${new Date(post.publishedAt).toLocaleDateString()}`}
        </p>
      </Link>
    </article>
  );
}
