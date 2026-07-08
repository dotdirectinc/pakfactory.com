import Link from "next/link";
import { ChevronLeft, Compass } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { tagHref } from "@/lib/blog-post-url";
import type { TopicChip } from "@/lib/blog-data";

/** POC recovery chip — white rounded-full pill (matches the topic detail chips). */
const CHIP_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors hover:border-foreground/30";

/**
 * Blog 404 hero (PROD-1896 / Figma 2407:25166): the "page not found" message
 * with recovery actions — an "Explore topics" chip, curated recommended-topic
 * chips, and a "Back to Blog Home" button. Renders the page's single `h1`.
 */
export function NotFoundHero({ topics }: { topics: TopicChip[] }) {
  return (
    <section className="bg-background">
      <PageDielineSection innerClassName="flex flex-col items-center gap-6 py-20 text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          HTTP 404 · Page not found
        </p>

        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground lg:text-5xl">
            This Page Could Not Be Found
          </h1>
          <p className="max-w-[520px] text-base leading-7 text-muted-foreground">
            The link you followed may be broken, the post may have been moved,
            or the URL may be a typo.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/topics" className={CHIP_CLASS}>
            <Compass className="size-4 shrink-0" aria-hidden />
            Explore topics
          </Link>
          {topics.map((topic) => (
            <Link
              key={topic._id ?? topic.slug}
              href={tagHref(topic.slug)}
              className={CHIP_CLASS}
            >
              {topic.title}
            </Link>
          ))}
        </div>

        <Button
          asChild
          variant="outline"
          className="mt-2 h-11 rounded-full border-border bg-background px-6 text-base font-medium hover:bg-muted/50"
        >
          <Link href="/">
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            Back to Blog Home
          </Link>
        </Button>
      </PageDielineSection>
    </section>
  );
}
