import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { HomeIndustryPill } from "@/lib/blog-home";

function wwwOrigin(): string {
  const www = process.env.NEXT_PUBLIC_WWW_URL?.replace(/\/$/, "");
  return www || "https://www.pakfactory.com";
}

function industryHref(slug: string): string {
  return `${wwwOrigin()}/industries/${slug}`;
}

type HomeIndustryStripProps = {
  industries: HomeIndustryPill[];
};

/** De-emphasised industry pills linking to www (out of blog route scope). */
export function HomeIndustryStrip({ industries }: HomeIndustryStripProps) {
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
                <Link href={industryHref(ind.slug)}>{ind.title}</Link>
              </Badge>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
