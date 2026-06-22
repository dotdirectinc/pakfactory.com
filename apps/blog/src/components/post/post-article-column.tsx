import type { PortableTextBlock } from "@portabletext/types";
import { PostPortableText } from "@/components/post/post-portable-text";
import type { BlogPostDetail } from "@/lib/blog-post";
import { POST_ARTICLE_ID } from "@/lib/reading-progress";
import { PostAuthorBio } from "@/components/post/post-author-bio";
import { PostFaqSection } from "@/components/post/post-faq-section";
import { PostTagChips } from "@/components/post/post-tag-chips";

type PostArticleColumnProps = {
  post: BlogPostDetail;
  headingIdByKey: Record<string, string>;
};

export function PostArticleColumn({ post, headingIdByKey }: PostArticleColumnProps) {
  return (
    <article id={POST_ARTICLE_ID}>
      {post.tldr?.length ? (
        <aside
          className="mb-10 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4"
          aria-labelledby="post-tldr-heading"
        >
          <h2
            id="post-tldr-heading"
            className="text-sm font-semibold uppercase tracking-wide text-primary"
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
      <PostAuthorBio
        name={post.author?.name}
        slug={post.author?.slug}
        role={post.author?.role}
        tagline={post.author?.tagline}
        shortBio={post.author?.shortBio}
        photo={post.author?.photo}
      />
    </article>
  );
}
