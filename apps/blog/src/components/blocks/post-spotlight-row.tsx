import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import type { PostSpotlightRowBlock, BlockProps } from "@/components/blocks/registry";
import { PageDielineFullBleedSection } from "@/components/layout/page-dieline-section";
import { PostCard } from "@/components/modules/post-card";
import {
  POST_ROW_DIELINE_BORDER_DEFAULTS,
  resolveDielineBorders,
} from "@/lib/dieline-borders";
import { toPostCardDataList } from "@/lib/post-card-data";

/**
 * `postSpotlightRow` page-builder section — a curated set of posts in a spotlight
 * layout: the first post leads, the rest stack alongside it.
 */
export function PostSpotlightRow({
  heading,
  posts,
  showTopBorder,
  showBottomBorder,
}: BlockProps<PostSpotlightRowBlock>) {
  const cards = toPostCardDataList(posts);
  const [lead, ...rest] = cards;
  if (!lead) return null;

  const { borderTop, borderBottom } = resolveDielineBorders(
    showTopBorder,
    showBottomBorder,
    POST_ROW_DIELINE_BORDER_DEFAULTS,
  );

  return (
    <PageDielineFullBleedSection
      aria-labelledby="post-spotlight-row-heading"
      borderTop={borderTop}
      borderBottom={borderBottom}
      innerClassName="py-10"
    >
      <div className="mb-8 flex items-center justify-between gap-8">
        <h2
          id="post-spotlight-row-heading"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {heading ?? "Spotlight"}
        </h2>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href="/all">
            View all
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,717px)_1fr]">
        <PostCard post={lead} variant="featured" />
        <div className="flex flex-col gap-8">
          {rest.map((post) => (
            <PostCard key={post._id} post={post} variant="default" />
          ))}
        </div>
      </div>
    </PageDielineFullBleedSection>
  );
}
