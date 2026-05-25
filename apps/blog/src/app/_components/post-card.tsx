import Link from "next/link";
import Image from "next/image";
import type { HomePostCard } from "@/lib/blog-home";
import { sanityImageUrl } from "@/lib/sanity-image";

type PostCardProps = {
  post: HomePostCard;
  variant?: "default" | "compact" | "featured";
};

export function PostCard({ post, variant = "default" }: PostCardProps) {
  const imageUrl = sanityImageUrl(post.mainImage, variant === "featured" ? 900 : 400);
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";

  return (
    <article className={isFeatured ? "space-y-3" : isCompact ? "space-y-1" : "space-y-2"}>
      <Link href={`/${post.slug}`} className="group block">
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
