import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";
import type { CaseStudyTaxonomyItem } from "@pakfactory/sanity/queries";

export type CaseStudyCardProps = {
  title: string;
  href: string;
  clientName?: string | null;
  cardSummary?: string | null;
  cardImageUrl?: string | null;
  cardImageAlt?: string | null;
  solutions?: CaseStudyTaxonomyItem[] | null;
  products?: CaseStudyTaxonomyItem[] | null;
  isVideo?: boolean;
  className?: string;
  priority?: boolean;
};

export function CaseStudyCard({
  title,
  href,
  clientName,
  cardSummary,
  cardImageUrl,
  cardImageAlt,
  isVideo = false,
  className,
  priority = false,
}: CaseStudyCardProps) {
  const displayName = clientName || title;

  return (
    <article className={cn("group flex flex-col gap-[14px]", className)}>
      <Link href={href} className="relative block">
        <div className="relative aspect-square overflow-hidden rounded-[10px] bg-muted">
          {cardImageUrl ? (
            <Image
              src={cardImageUrl}
              alt={cardImageAlt ?? title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary text-xl font-semibold tracking-tight text-muted-foreground">
              {displayName}
            </div>
          )}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors hover:bg-black/25">
              <span className="flex size-[54px] items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-6 translate-x-[1px] text-foreground" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-[14px]">
        <div className="flex flex-col gap-2.5">
          <p className="text-base font-medium leading-6 text-foreground">{displayName}</p>
          {cardSummary && (
            <p className="text-sm leading-5 text-muted-foreground">{cardSummary}</p>
          )}
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Read Story
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.75} />
        </Link>
      </div>
    </article>
  );
}
