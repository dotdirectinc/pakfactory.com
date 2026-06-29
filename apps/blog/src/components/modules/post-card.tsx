import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@pakfactory/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@pakfactory/ui/components/avatar";

/** Plain, client-safe post card props — resolved server-side before render. */
export type PostCardData = {
  _id: string;
  href: string;
  title: string;
  excerpt?: string;
  imageUrl?: string;
  imageAlt?: string;
  categoryTitle?: string;
  authorName?: string;
  authorImageUrl?: string;
  publishedAt?: string;
  formattedDate?: string;
  readingTimeLabel?: string;
};

type PostCardProps = {
  post: PostCardData;
  variant?:
    | "default"
    | "compact"
    | "featured"
    | "horizontal"
    | "headline"
    | "rail"
    | "categoryHero";
  showFeaturedBadge?: boolean;
};

function authorInitials(name?: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function MetaDot() {
  return (
    <span
      className="inline-block size-1 shrink-0 rounded-full bg-muted-foreground/60"
      aria-hidden
    />
  );
}

function CategoryBadge({ title }: { title: string }) {
  return (
    <Badge className="w-fit border-transparent bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
      {title}
    </Badge>
  );
}

function FeaturedBadge() {
  return (
    <Badge className="w-fit border-transparent bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
      Featured
    </Badge>
  );
}

function CardBadge({
  showFeaturedBadge,
  categoryTitle,
}: {
  showFeaturedBadge?: boolean;
  categoryTitle?: string;
}) {
  if (showFeaturedBadge) return <FeaturedBadge />;
  if (categoryTitle) return <CategoryBadge title={categoryTitle} />;
  return null;
}

function PostMeta({
  post,
  tone = "listing",
}: {
  post: PostCardData;
  tone?: "listing" | "featured" | "horizontal";
}) {
  const isFeatured = tone === "featured";
  const isHorizontal = tone === "horizontal";
  const mutedClass = "text-sm text-muted-foreground";

  if (isHorizontal) {
    const metaSegments: ReactNode[] = [];

    if (post.readingTimeLabel) {
      metaSegments.push(
        <span key="read" className={mutedClass}>
          {post.readingTimeLabel}
        </span>,
      );
    }

    if (post.formattedDate && post.publishedAt) {
      metaSegments.push(
        <time key="date" dateTime={post.publishedAt} className={mutedClass}>
          {post.formattedDate}
        </time>,
      );
    }

    if (!post.authorName && metaSegments.length === 0) return null;

    return (
      <div className="flex flex-col gap-1">
        {post.authorName && (
          <p className="text-sm text-foreground">{post.authorName}</p>
        )}
        {metaSegments.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {metaSegments.map((segment, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <MetaDot />}
                {segment}
              </span>
            ))}
          </p>
        )}
      </div>
    );
  }

  const segments: ReactNode[] = [];

  if (post.authorName) {
    segments.push(
      <span
        key="author"
        className="inline-flex items-center gap-2 text-sm text-foreground"
      >
        {isFeatured && (
          <Avatar size="sm" className="size-7">
            {post.authorImageUrl && (
              <AvatarImage src={post.authorImageUrl} alt={post.authorName} />
            )}
            <AvatarFallback>{authorInitials(post.authorName)}</AvatarFallback>
          </Avatar>
        )}
        <span>{post.authorName}</span>
      </span>,
    );
  }

  if (post.readingTimeLabel) {
    segments.push(
      <span key="read" className={mutedClass}>
        {post.readingTimeLabel}
      </span>,
    );
  }

  if (post.formattedDate && post.publishedAt) {
    segments.push(
      <time key="date" dateTime={post.publishedAt} className={mutedClass}>
        {post.formattedDate}
      </time>,
    );
  }

  if (segments.length === 0) return null;

  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      {segments.map((segment, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 && <MetaDot />}
          {segment}
        </span>
      ))}
    </p>
  );
}

export function PostCard({
  post,
  variant = "default",
  showFeaturedBadge = false,
}: PostCardProps) {
  const isFeatured = variant === "featured";
  const isCategoryHero = variant === "categoryHero";
  const isHorizontal = variant === "horizontal";
  const isCompact = variant === "compact";
  const isHeadline = variant === "headline";
  const isRail = variant === "rail";

  if (isRail) {
    return (
      <div>
        <Link href={post.href} className="group block">
          <span className="font-medium group-hover:underline">{post.title}</span>
          {post.excerpt && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {post.excerpt}
            </p>
          )}
        </Link>
      </div>
    );
  }

  if (isHeadline) {
    return (
      <article className="border-b border-border pb-4 last:border-b-0">
        <Link href={post.href} className="group block space-y-1">
          {post.formattedDate && post.publishedAt && (
            <time
              dateTime={post.publishedAt}
              className="text-xs font-semibold uppercase tracking-wide text-primary"
            >
              {post.formattedDate}
            </time>
          )}
          <h3 className="text-lg font-bold leading-snug tracking-tight group-hover:underline sm:text-xl">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {post.excerpt}
            </p>
          )}
        </Link>
      </article>
    );
  }

  if (isFeatured) {
    return (
      <article className="flex flex-col gap-6">
        <Link href={post.href} className="group block">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-muted">
            {post.imageUrl && (
              <Image
                src={post.imageUrl}
                alt={post.imageAlt ?? ""}
                fill
                className="object-cover transition-transform group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 640px"
                priority
              />
            )}
          </div>
        </Link>
        <div className="flex flex-col gap-3">
          <CardBadge
            showFeaturedBadge={showFeaturedBadge}
            categoryTitle={post.categoryTitle}
          />
          <Link href={post.href} className="group block">
            <h3 className="text-5xl font-semibold leading-none text-card-foreground group-hover:underline">
              {post.title}
            </h3>
          </Link>
          <PostMeta post={post} tone="featured" />
        </div>
      </article>
    );
  }

  if (isCategoryHero) {
    return (
      <article className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Link href={post.href} className="group block min-w-0 flex-1">
          <div className="relative min-h-[240px] overflow-hidden rounded-[14px] bg-muted lg:min-h-[400px]">
            {post.imageUrl && (
              <Image
                src={post.imageUrl}
                alt={post.imageAlt ?? ""}
                fill
                className="object-cover transition-transform group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            )}
          </div>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <CardBadge showFeaturedBadge={showFeaturedBadge} />
          <Link href={post.href} className="group block">
            <h3 className="text-3xl font-semibold leading-10 text-card-foreground group-hover:underline sm:text-4xl">
              {post.title}
            </h3>
          </Link>
          {post.excerpt && (
            <p className="line-clamp-2 text-base text-muted-foreground">
              {post.excerpt}
            </p>
          )}
          <PostMeta post={post} tone="featured" />
        </div>
      </article>
    );
  }

  if (isHorizontal) {
    return (
      <article className="flex gap-6">
        <Link href={post.href} className="group shrink-0">
          <div className="relative size-[200px] overflow-hidden rounded-[14px] bg-muted">
            {post.imageUrl && (
              <Image
                src={post.imageUrl}
                alt={post.imageAlt ?? ""}
                fill
                className="object-cover transition-transform group-hover:scale-[1.02]"
                sizes="200px"
              />
            )}
          </div>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <CardBadge
            showFeaturedBadge={showFeaturedBadge}
            categoryTitle={post.categoryTitle}
          />
          <Link href={post.href} className="group block">
            <h3 className="text-2xl font-medium leading-8 text-card-foreground group-hover:underline">
              {post.title}
            </h3>
          </Link>
          <PostMeta post={post} tone="horizontal" />
        </div>
      </article>
    );
  }

  if (isCompact) {
    return (
      <div>
        <Link href={post.href} className="group block space-y-1">
          <h3 className="text-sm font-medium leading-snug group-hover:underline">
            {post.title}
          </h3>
        </Link>
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-6">
      <Link href={post.href} className="group block">
        <div className="relative h-60 min-h-[180px] overflow-hidden rounded-[14px] bg-muted">
          {post.imageUrl && (
            <Image
              src={post.imageUrl}
              alt={post.imageAlt ?? ""}
              fill
              className="object-cover transition-transform group-hover:scale-[1.02]"
              sizes="(max-width: 1024px) 50vw, 320px"
            />
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-3">
        <CardBadge
          showFeaturedBadge={showFeaturedBadge}
          categoryTitle={post.categoryTitle}
        />
        <Link href={post.href} className="group block">
          <h3 className="text-2xl font-medium leading-8 text-card-foreground group-hover:underline">
            {post.title}
          </h3>
        </Link>
        <PostMeta post={post} tone="listing" />
      </div>
    </article>
  );
}
