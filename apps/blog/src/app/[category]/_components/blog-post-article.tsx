import Link from "next/link";
import type { BlogPostDetail } from "@/lib/blog-post";
import { categoryHref } from "@/lib/blog-post-url";

type BlogPostArticleProps = {
  post: BlogPostDetail;
  jsonLd: string;
};

export function BlogPostArticle({ post, jsonLd }: BlogPostArticleProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Blog
          </Link>
          {post.categorySlug && post.categoryTitle && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={categoryHref(post.categorySlug)}
                className="hover:text-foreground"
              >
                {post.categoryTitle}
              </Link>
            </>
          )}
        </nav>
        <article>
          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {post.author?.name}
            {post.publishedAt &&
              ` · ${new Date(post.publishedAt).toLocaleDateString()}`}
          </p>
        </article>
      </main>
    </>
  );
}
