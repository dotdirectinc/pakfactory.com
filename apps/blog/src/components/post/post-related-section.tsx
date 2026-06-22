import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { PostList } from "@/components/modules/post-list";
import type { HomePostCard } from "@/lib/blog-home";
import { toPostCardDataList } from "@/lib/post-card-data";

type PostRelatedSectionProps = {
  posts: HomePostCard[];
  categorySlug?: string;
};

export function PostRelatedSection({ posts, categorySlug }: PostRelatedSectionProps) {
  const cards = toPostCardDataList(posts, { categorySlug });
  if (cards.length === 0) return null;

  return (
    <PageDielineSection innerClassName="border-t border-dashed py-16 sm:py-24">
      <section aria-labelledby="post-related-heading">
        <h2
          id="post-related-heading"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Related articles
        </h2>
        <div className="mt-10">
          <PostList posts={cards} variant="horizontal" />
        </div>
      </section>
    </PageDielineSection>
  );
}
