import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { TopicChip, TopicExploreChip } from "@/components/ui/topic-chip";
import { tagHref } from "@/lib/blog-post-url";
import type { TopicChip as TopicChipData } from "@/lib/blog-data";

/**
 * Blog 404 hero (PROD-1896 / Figma 2407:25166): the "page not found" message
 * with recovery actions — an "Explore topics" chip, curated recommended-topic
 * chips, and a "Back to Blog Home" button. Renders the page's single `h1`.
 */
export function NotFoundHero({ topics }: { topics: TopicChipData[] }) {
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
          <TopicExploreChip href="/topics" />
          {topics.map((topic) => (
            <TopicChip key={topic._id ?? topic.slug} href={tagHref(topic.slug)}>
              {topic.title}
            </TopicChip>
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
