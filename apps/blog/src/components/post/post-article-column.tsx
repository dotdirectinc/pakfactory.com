import type { PortableTextBlock } from "@portabletext/types";
import { PostPortableText } from "@/components/post/post-portable-text";
import type { BlogPostDetail } from "@/lib/blog-post";
import { POST_ARTICLE_ID } from "@/lib/reading-progress";
import { PostAskAi } from "@/components/post/post-ask-ai";
import { PostAuthorCard } from "@/components/post/post-author-card";
import { PostFaqSection } from "@/components/post/post-faq-section";
import { PostShareButtons } from "@/components/post/post-share-buttons";
import { PostTagChips } from "@/components/post/post-tag-chips";

type PostArticleColumnProps = {
  post: BlogPostDetail;
  headingIdByKey: Record<string, string>;
  shareUrl: string;
  shareTitle: string;
};

export function PostArticleColumn({
  post,
  headingIdByKey,
  shareUrl,
  shareTitle,
}: PostArticleColumnProps) {
  return (
    <article id={POST_ARTICLE_ID} className="flex flex-col gap-8">
      {post.tldr?.length ? (
        <div className="border-y border-dashed border-border py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            Key takeaways
          </p>
          <PostPortableText
            value={post.tldr as PortableTextBlock[]}
            className="mt-3 text-sm leading-relaxed text-foreground"
          />
        </div>
      ) : null}

      {post.body?.length ? (
        <PostPortableText
          value={post.body}
          headingIdByKey={headingIdByKey}
          className="text-base leading-7 text-foreground"
        />
      ) : null}

      <PostFaqSection items={post.faqItems ?? []} />
      <PostTagChips tags={post.tags ?? []} />

      {/* Mobile: author, share, Ask AI at the foot of the article */}
      {post.author?.name ? (
        <div className="border-t border-dashed border-border pt-8 lg:hidden">
          <PostAuthorCard author={post.author} />
        </div>
      ) : null}
      <div className="border-t border-dashed border-border pt-8 lg:hidden">
        <PostShareButtons url={shareUrl} title={shareTitle} />
      </div>
      <div className="border-t border-dashed border-border pt-8 lg:hidden">
        <PostAskAi url={shareUrl} title={shareTitle} />
      </div>
    </article>
  );
}
