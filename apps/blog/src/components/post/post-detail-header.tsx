import Image from "next/image";
import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@pakfactory/ui/components/avatar";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { formatPostDate, formatReadTime } from "@/lib/post-format";
import { authorHref, categoryHref } from "@/lib/blog-post-url";
import { sanityImageUrl } from "@/lib/sanity-image";

type PostDetailHeaderProps = {
  title: string;
  categoryTitle?: string;
  categorySlug?: string;
  authorName?: string;
  authorSlug?: string | null;
  authorPhoto?: unknown;
  publishedAt?: string;
  lastModified?: string | null;
  readingTimeMinutes?: number | null;
  mainImage?: unknown;
  mainImageAlt?: string;
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
      className="inline-block size-2.5 shrink-0 rounded-full bg-muted-foreground/60"
      aria-hidden
    />
  );
}

function CategoryPill({
  title,
  slug,
}: {
  title: string;
  slug?: string;
}) {
  const badge = (
    <Badge className="w-fit border-transparent bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
      {title}
    </Badge>
  );

  if (slug) {
    return (
      <Link href={categoryHref(slug)} className="no-underline">
        {badge}
      </Link>
    );
  }

  return badge;
}

export function PostDetailHeader({
  title,
  categoryTitle,
  categorySlug,
  authorName,
  authorSlug,
  authorPhoto,
  publishedAt,
  lastModified,
  readingTimeMinutes,
  mainImage,
  mainImageAlt,
}: PostDetailHeaderProps) {
  const heroUrl = sanityImageUrl(mainImage, 1400);
  const authorPhotoUrl = sanityImageUrl(authorPhoto, 56);
  const publishedLabel = formatPostDate(publishedAt);
  const updatedLabel = formatPostDate(lastModified ?? publishedAt);
  const readLabel = formatReadTime(readingTimeMinutes);

  return (
    <section aria-labelledby="post-heading">
      <PageDielineSection innerClassName="border-b border-dashed py-12 sm:py-16">
        <div className="flex w-full flex-col gap-10 sm:gap-[42px]">
          <figure className="relative h-[280px] w-full overflow-hidden rounded-[14px] bg-muted sm:h-[400px] lg:h-[600px]">
            {heroUrl ? (
              <Image
                src={heroUrl}
                alt={mainImageAlt ?? title}
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority
              />
            ) : null}
          </figure>

          <div className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-4">
              {categoryTitle ? (
                <CategoryPill title={categoryTitle} slug={categorySlug} />
              ) : null}

              <h1
                id="post-heading"
                className="text-5xl font-semibold tracking-tight text-foreground"
              >
                {title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-base">
              {authorName ? (
                <>
                  <Avatar className="size-7">
                    {authorPhotoUrl ? (
                      <AvatarImage src={authorPhotoUrl} alt={authorName} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {authorInitials(authorName)}
                    </AvatarFallback>
                  </Avatar>
                  {authorSlug ? (
                    <Link
                      href={authorHref(authorSlug)}
                      className="font-medium text-foreground hover:underline"
                    >
                      {authorName}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{authorName}</span>
                  )}
                </>
              ) : null}
              {publishedLabel ? (
                <>
                  {authorName ? <MetaDot /> : null}
                  <span className="font-medium text-muted-foreground">
                    Published: {publishedLabel}
                  </span>
                </>
              ) : null}
              {updatedLabel ? (
                <>
                  <MetaDot />
                  <span className="font-medium text-muted-foreground">
                    Last Updated: {updatedLabel}
                  </span>
                </>
              ) : null}
              {readLabel ? (
                <>
                  <MetaDot />
                  <span className="font-medium text-muted-foreground">{readLabel}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </PageDielineSection>
    </section>
  );
}
