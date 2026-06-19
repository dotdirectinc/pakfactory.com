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
};

/**
 * Figma `Category Header` (node 2287:3514) — full-bleed accent band, no vertical
 * dieline borders. Content aligns with nav column; description max-width 880px.
 */
export function CategoryHeader({
  title,
  description,
  descriptionText,
}: CategoryHeaderProps) {
  const hasPortableDescription = Boolean(description?.length);
  const plainDescription = descriptionText?.trim();

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
          </div>
        </div>
      </div>
    </section>
  );
}
