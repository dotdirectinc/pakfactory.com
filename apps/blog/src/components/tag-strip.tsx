import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { HomeIndustryPill } from "@/lib/blog-home";
import { tagHref } from "@/lib/blog-post-url";

type TagStripProps = {
  industries: HomeIndustryPill[];
};

/** Industry-axis tag pills (tagGroup == "industry") linking to their `/tag/{slug}` archives. */
export function TagStrip({ industries }: TagStripProps) {
  if (industries.length === 0) return null;

  return (
    <section
      className="border-b py-8"
      aria-labelledby="browse-industries-heading"
    >
      <h2
        id="browse-industries-heading"
        className="text-sm font-medium text-muted-foreground"
      >
        Browse by Industries
      </h2>
      <nav className="mt-3" aria-label="Industries">
        <ul className="flex flex-wrap gap-2">
          {industries.map((ind) => (
            <li key={ind._id ?? ind.slug}>
              <Badge variant="outline" asChild className="font-normal text-muted-foreground">
                <Link href={tagHref(ind.slug)}>{ind.title}</Link>
              </Badge>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
