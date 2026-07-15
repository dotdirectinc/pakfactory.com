import type { ReactNode } from "react";
import type { PortableTextBlock } from "@portabletext/types";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { PortableText } from "@/components/ui/portable-text";
import { SanityImage } from "@/components/ui/sanity-image";
import { isSanityCdnUrl } from "@/lib/sanity-image";
import Image from "next/image";

type PageHeaderProps = {
  title: string;
  description?: PortableTextBlock[];
  /** Plain-text fallback for SEO metadata or when portable text is unavailable. */
  descriptionText?: string;
  bannerImageUrl?: string;
  /** Optional slot below description (e.g. related topic pills on topic detail). */
  belowContent?: ReactNode;
};

/**
 * Accent header band for landing/index pages (Figma `Category Header`, node 2287:3514)
 * — standard dieline column (same stack as breadcrumb); content aligns with the nav
 * column; description max-width 880px. Reused by the category archive and the topics
 * index (generalized from the former `CategoryHeader` at ADR-011 2nd use).
 */
export function PageHeader({
  title,
  description,
  descriptionText,
  bannerImageUrl,
  belowContent,
}: PageHeaderProps) {
  const hasPortableDescription = Boolean(description?.length);
  const plainDescription = descriptionText?.trim();
  const bannerSrc = bannerImageUrl?.trim();

  return (
    <PageDielineSection className="bg-accent" innerClassName="py-16">
      <div className="flex max-w-[55rem] flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1
            id="page-header-heading"
            className="text-4xl font-semibold leading-tight tracking-tight text-foreground lg:text-5xl"
          >
            {title}
          </h1>
          {hasPortableDescription ? (
            <PortableText
              value={description}
              className="text-xl leading-7 text-muted-foreground [&_a]:underline [&_p:last-child]:mb-0 [&_p]:mb-0 [&_p]:leading-7"
            />
          ) : plainDescription ? (
            <p className="text-xl leading-7 text-muted-foreground">
              {plainDescription}
            </p>
          ) : null}
        </div>
        {bannerSrc ? (
          <div className="relative aspect-[21/9] max-w-full overflow-hidden rounded-[14px]">
            {isSanityCdnUrl(bannerSrc) ? (
              <SanityImage
                src={bannerSrc}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 880px) 100vw, 880px"
                priority
              />
            ) : (
              <Image
                src={bannerSrc}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 880px) 100vw, 880px"
                priority
              />
            )}
          </div>
        ) : null}
        {belowContent}
      </div>
    </PageDielineSection>
  );
}
