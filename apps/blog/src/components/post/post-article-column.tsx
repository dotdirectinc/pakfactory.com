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
    <article id={POST_ARTICLE_ID}>
      {post.tldr?.length ? (
        <aside
          className="mb-8 rounded-2xl border border-border bg-muted/40 p-6"
          aria-labelledby="post-tldr-heading"
        >
          <h2
            id="post-tldr-heading"
            className="text-base font-semibold text-foreground"
          >
            Key takeaways
          </h2>
          <PostPortableText
            value={post.tldr as PortableTextBlock[]}
            className="mt-3 text-sm leading-relaxed text-foreground"
          />
        </aside>
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

      {/* Mobile: author, share, Ask AI at the foot of the article — the sticky
          sidebar is hidden below lg, and the table of contents is intentionally
          omitted here. */}
      {post.author?.name ? (
        <div className="mt-10 border-t border-dashed border-border pt-8 lg:hidden">
          <PostAuthorCard author={post.author} />
        </div>
      ) : null}
      <div className="mt-8 border-t border-dashed border-border pt-8 lg:hidden">
        <PostShareButtons url={shareUrl} title={shareTitle} />
      </div>
      <div className="mt-8 border-t border-dashed border-border pt-8 lg:hidden">
        <PostAskAi url={shareUrl} title={shareTitle} />
      </div>
    </article>
  );
}
