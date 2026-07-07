import Image from "next/image";
import Link from "next/link";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { formatPostDate, formatReadTime } from "@/lib/post-format";
import { categoryHref } from "@/lib/blog-post-url";
import { sanityImageUrl } from "@/lib/sanity-image";

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

function MetaDot() {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full bg-muted-foreground/60"
      aria-hidden
    />
  );
}

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
  const heroUrl = sanityImageUrl(mainImage, 1400);
  const publishedLabel = formatPostDate(publishedAt);
  const updatedLabel = formatPostDate(lastModified ?? publishedAt);
  const readLabel = formatReadTime(readingTimeMinutes);

  return (
    <section aria-labelledby="post-heading" className="bg-muted">
      <PageDielineSection innerClassName="border-b border-dashed py-12 sm:py-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          {/* Text column */}
          <div className="flex flex-col gap-6 lg:flex-1">
            <div className="flex flex-col gap-4">
              {categoryTitle ? (
                categorySlug ? (
                  <Link
                    href={categoryHref(categorySlug)}
                    className="w-fit text-sm text-foreground hover:underline"
                  >
                    {categoryTitle}
                  </Link>
                ) : (
                  <span className="text-sm text-foreground">{categoryTitle}</span>
                )
              ) : null}

              <h1
                id="post-heading"
                className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                {title}
              </h1>
            </div>

            {subtitle ? (
              <p className="text-base leading-6 text-muted-foreground">{subtitle}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-base">
              {publishedLabel ? (
                <span className="font-medium text-muted-foreground">
                  Published: {publishedLabel}
                </span>
              ) : null}
              {updatedLabel ? (
                <>
                  {publishedLabel ? <MetaDot /> : null}
                  <span className="font-medium text-muted-foreground">
                    Last Updated: {updatedLabel}
                  </span>
                </>
              ) : null}
              {readLabel ? (
                <>
                  {publishedLabel || updatedLabel ? <MetaDot /> : null}
                  <span className="font-medium text-muted-foreground">
                    {readLabel}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {/* Hero image column */}
          <figure className="relative h-[240px] w-full overflow-hidden rounded-[14px] bg-background sm:h-[320px] lg:h-[333px] lg:flex-1">
            {heroUrl ? (
              <Image
                src={heroUrl}
                alt={mainImageAlt ?? title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 620px"
                priority
              />
            ) : null}
          </figure>
        </div>
      </PageDielineSection>
    </section>
  );
}
