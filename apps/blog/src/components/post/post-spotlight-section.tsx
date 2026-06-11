import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { PageDielineFullBleedSection } from "@/components/common/page-dieline-section";
import { PostCard, type PostCardData } from "@/components/post/post-card";

type PostSpotlightSectionProps = {
  viewAllHref?: string;
  borderTop?: boolean;
  borderBottom?: boolean;
};

// Mock data placeholder — swap for a curated Sanity source when available.
const SPOTLIGHT_POSTS: PostCardData[] = [
  {
    _id: "spotlight-1",
    href: "/all",
    title: "Building Systems That Support Long-Term Growth",
    categoryTitle: "Business Strategy",
    authorName: "Marcus Lee",
    readingTimeLabel: "5 min read",
    publishedAt: "2026-01-19",
    formattedDate: "Jan 19, 2026",
  },
  {
    _id: "spotlight-2",
    href: "/all",
    title: "Building Systems That Support Long-Term Growth",
    categoryTitle: "Business Strategy",
    authorName: "Marcus Lee",
    readingTimeLabel: "5 min read",
    publishedAt: "2026-01-19",
    formattedDate: "Jan 19, 2026",
  },
  {
    _id: "spotlight-3",
    href: "/all",
    title: "Building Systems That Support Long-Term Growth",
    categoryTitle: "Business Strategy",
    authorName: "Marcus Lee",
    readingTimeLabel: "5 min read",
    publishedAt: "2026-01-19",
    formattedDate: "Jan 19, 2026",
  },
];

export function PostSpotlightSection({
  viewAllHref = "/all",
  borderTop,
  borderBottom,
}: PostSpotlightSectionProps) {
  const [lead, ...rest] = SPOTLIGHT_POSTS;
  if (!lead) return null;

  return (
    <PageDielineFullBleedSection
      aria-labelledby="post-spotlight-heading"
      borderTop={borderTop}
      borderBottom={borderBottom}
      innerClassName="py-10"
    >
      <div className="mb-8 flex items-center justify-between gap-8">
        <h2
          id="post-spotlight-heading"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Spotlight
        </h2>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href={viewAllHref}>
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
