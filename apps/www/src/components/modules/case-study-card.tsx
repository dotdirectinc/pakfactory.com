import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SanityImage } from "@/components/ui/sanity-image";
import { cn } from "@pakfactory/ui/lib/utils";
import type { CaseStudyTaxonomyItem } from "@pakfactory/sanity/queries";

export type CaseStudyCardProps = {
  title: string;
  href: string;
  clientName?: string | null;
  cardImageUrl?: string | null;
  cardImageAlt?: string | null;
  products?: CaseStudyTaxonomyItem[] | null;
  className?: string;
  priority?: boolean;
};

export function CaseStudyCard({
  title,
  href,
  clientName,
  cardImageUrl,
  cardImageAlt,
  className,
  priority = false,
}: CaseStudyCardProps) {
  return (
    <article className={cn(className)}>
      <Link href={href} className="group flex flex-col gap-[14px]">
        <div className="relative aspect-square overflow-hidden rounded-[10px] bg-muted">
          {cardImageUrl ? (
            <SanityImage
              src={cardImageUrl}
              alt={cardImageAlt ?? title}
              fill
              square
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary text-xl font-semibold tracking-tight text-muted-foreground">
              {clientName || title}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-[14px]">
          <div className="flex flex-col gap-2.5">
            {clientName && (
              <p className="text-sm font-medium leading-5 text-muted-foreground">
                {clientName}
              </p>
            )}
            <p className="text-base font-semibold leading-6 text-foreground transition-colors group-hover:text-primary">
              {title}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
            Read Story
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={1.75}
            />
          </span>
        </div>
      </Link>
    </article>
  );
}
