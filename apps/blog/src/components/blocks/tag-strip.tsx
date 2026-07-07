import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { BlockProps, TagStripBlock } from "@/components/blocks/registry";
import { tagHref } from "@/lib/blog-post-url";

/**
 * `tagStrip` page-builder section — a horizontal strip of tag pills linking to
 * their `/topics/{slug}` archives (e.g. "Browse by Industries"). Generic over any
 * tag group.
 */
export function TagStrip({ heading, tags }: BlockProps<TagStripBlock>) {
  if (!tags || tags.length === 0) return null;

  const label = heading ?? "Browse by tags";
  const headingId = "tag-strip-heading";
  return (
    <section className="border-b py-8" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-muted-foreground">
        {label}
      </h2>
      <nav className="mt-3" aria-label={label}>
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag._id ?? tag.slug}>
              <Badge
                variant="outline"
                asChild
                className="font-normal text-muted-foreground"
              >
                <Link href={tagHref(tag.slug)}>{tag.title}</Link>
              </Badge>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
