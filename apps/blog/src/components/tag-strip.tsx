import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { tagHref } from "@/lib/blog-post-url";

/** A tag pill — any `blogTag` (industry is just one tag group/axis). */
export type TagStripItem = { _id?: string; slug: string; title: string };

type TagStripProps = {
  tags: TagStripItem[];
  heading?: string;
  /** Defaults to `heading`. */
  ariaLabel?: string;
};

/**
 * Horizontal strip of tag pills linking to their `/tag/{slug}` archives.
 * Generic over any tag group — home feeds it the industry-axis tags
 * ("Browse by Industries"); other pages can feed a different group.
 */
export function TagStrip({ tags, heading = "Browse by tags", ariaLabel }: TagStripProps) {
  if (tags.length === 0) return null;

  const headingId = "tag-strip-heading";
  return (
    <section className="border-b py-8" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-muted-foreground">
        {heading}
      </h2>
      <nav className="mt-3" aria-label={ariaLabel ?? heading}>
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag._id ?? tag.slug}>
              <Badge variant="outline" asChild className="font-normal text-muted-foreground">
                <Link href={tagHref(tag.slug)}>{tag.title}</Link>
              </Badge>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
