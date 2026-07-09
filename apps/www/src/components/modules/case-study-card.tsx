import Image from "next/image";
import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
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
  solutions,
  products,
  isVideo = false,
  className,
  priority = false,
}: CaseStudyCardProps) {
  const chips = [
    ...(solutions ?? []).slice(0, 2),
    ...(products ?? []).slice(0, 1),
  ].slice(0, 3);

  return (
    <article className={cn("flex flex-col gap-4", className)}>
      <Link href={href} className="group relative block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
          {cardImageUrl && (
            <Image
              src={cardImageUrl}
              alt={cardImageAlt ?? title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
              priority={priority}
            />
          )}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 translate-x-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-2">
        {clientName && (
          <p className="text-sm font-medium text-muted-foreground">{clientName}</p>
        )}
        <Link href={href} className="group block">
          <h2 className="text-lg font-medium leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {title}
          </h2>
        </Link>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Badge
                key={chip._id}
                variant="secondary"
                className="rounded-full px-2.5 py-0.5 text-xs font-normal"
              >
                {chip.title}
              </Badge>
            ))}
          </div>
        )}
        {cardSummary && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{cardSummary}</p>
        )}
        <Link
          href={href}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          Read Story →
        </Link>
      </div>
    </article>
  );
}
