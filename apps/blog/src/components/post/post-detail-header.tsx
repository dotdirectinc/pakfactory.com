import Link from "next/link";
import { SanityImage } from "@/components/ui/sanity-image";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { formatPostDate, formatReadTime } from "@/lib/post-format";
import { categoryHref } from "@/lib/blog-post-url";
import { sanityImageBaseUrl } from "@/lib/sanity-image";

type PostDetailHeaderProps = {
  title: string;
  subtitle?: string;
  categoryTitle?: string;
  categorySlug?: string;
  publishedAt?: string;
  lastModified?: string | null;
  readingTimeMinutes?: number | null;
  mainImage?: unknown;
  mainImageAlt?: string;
};

export function PostDetailHeader({
  title,
  subtitle,
  categoryTitle,
  categorySlug,
  publishedAt,
  lastModified,
  readingTimeMinutes,
  mainImage,
  mainImageAlt,
}: PostDetailHeaderProps) {
  const heroUrl = sanityImageBaseUrl(mainImage);
  const publishedLabel = formatPostDate(publishedAt);
  const updatedLabel = formatPostDate(lastModified ?? publishedAt);
  const readLabel = formatReadTime(readingTimeMinutes);

  return (
    <section aria-labelledby="post-heading" className="bg-brand-cream">
      <PageDielineSection innerClassName="grid grid-cols-1 items-center gap-8 py-10 md:py-12 lg:grid-cols-2">
        {/* Text column */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {categoryTitle ? (
            categorySlug ? (
              <Link
                href={categoryHref(categorySlug)}
                className="w-fit text-xs font-semibold uppercase tracking-[0.08em] text-primary hover:text-primary/80"
              >
                {categoryTitle}
              </Link>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                {categoryTitle}
              </span>
            )
          ) : null}

          <h1
            id="post-heading"
            className="text-4xl font-semibold leading-tight tracking-tight text-foreground lg:text-5xl"
          >
            {title}
          </h1>
        </div>

        {subtitle ? (
          <p className="text-base leading-7 text-muted-foreground">{subtitle}</p>
        ) : null}

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-muted-foreground">
          {publishedLabel ? <span>Published: {publishedLabel}</span> : null}
          {updatedLabel ? (
            <>
              {publishedLabel ? <span aria-hidden>·</span> : null}
              <span>Last Updated: {updatedLabel}</span>
            </>
          ) : null}
          {readLabel ? (
            <>
              {publishedLabel || updatedLabel ? <span aria-hidden>·</span> : null}
              <span>{readLabel}</span>
            </>
          ) : null}
        </p>
      </div>

      {/* Hero image column */}
      <figure className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary">
        {heroUrl ? (
          <SanityImage
            src={heroUrl}
            alt={mainImageAlt ?? title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 620px"
            priority
          />
        ) : null}
      </figure>
      </PageDielineSection>
    </section>
  );
}
