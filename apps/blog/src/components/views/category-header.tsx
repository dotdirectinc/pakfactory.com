import Image from "next/image";
import type { PortableTextBlock } from "@portabletext/types";
import {
  pageDielineContentClass,
  pageDielineOuterClass,
} from "@/components/layout/page-dieline-section";
import { PortableText } from "@/components/ui/portable-text";

type CategoryHeaderProps = {
  title: string;
  description?: PortableTextBlock[];
  /** Plain-text fallback for SEO metadata or when portable text is unavailable. */
  descriptionText?: string;
  bannerImageUrl?: string;
};

/**
 * Figma `Category Header` (node 2287:3514) — full-bleed accent band, no vertical
 * dieline borders. Content aligns with nav column; description max-width 880px.
 */
export function CategoryHeader({
  title,
  description,
  descriptionText,
  bannerImageUrl,
}: CategoryHeaderProps) {
  const hasPortableDescription = Boolean(description?.length);
  const plainDescription = descriptionText?.trim();
  const bannerSrc = bannerImageUrl?.trim();

  return (
    <section className="bg-accent" aria-labelledby="category-heading">
      <div className={pageDielineOuterClass()}>
        <div className={pageDielineContentClass("py-16")}>
          <div className="flex max-w-[55rem] flex-col gap-6">
            <h1
              id="category-heading"
              className="text-5xl font-semibold text-foreground"
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
            {bannerSrc ? (
              <div className="relative mt-2 aspect-[21/9] max-w-full overflow-hidden rounded-[14px]">
                <Image
                  src={bannerSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 880px) 100vw, 880px"
                  priority
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
