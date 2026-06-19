import type { PortableTextBlock } from "@portabletext/types";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@pakfactory/ui/components/badge";
import { PortableText } from "@/components/ui/portable-text";
import { PostList } from "@/components/modules/post-list";
import type { BlogPostDetail } from "@/lib/blog-post";
import { categoryHref } from "@/lib/blog-post-url";
import { toPostCardDataList } from "@/lib/post-card-data";
import { sanityImageUrl } from "@/lib/sanity-image";

type PostFaqItem = {
  question?: string;
  answer?: PortableTextBlock[];
  answerText?: string;
};

type PostDetailViewProps = {
  post: BlogPostDetail;
};

function formatPostDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return undefined;
  }
}

export function PostDetailView({ post }: PostDetailViewProps) {
  const heroUrl = sanityImageUrl(post.mainImage, 1200);
  const heroAlt =
    typeof post.mainImage === "object" &&
    post.mainImage !== null &&
    "alt" in post.mainImage &&
    typeof (post.mainImage as { alt?: string }).alt === "string"
      ? (post.mainImage as { alt?: string }).alt
      : post.title;
  const publishedLabel = formatPostDate(post.publishedAt);
  const updatedLabel = formatPostDate(post.lastModified ?? undefined);
  const showUpdated =
    post.lastModified &&
    post.publishedAt &&
    post.lastModified !== post.publishedAt;
  const faqItems = (post.faqItems ?? []).filter(
    (item): item is PostFaqItem & { question: string } =>
      Boolean(item.question?.trim()),
  );
  const relatedCards = toPostCardDataList(post.relatedPosts ?? []);

  return (
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
        {post.categoryTitle && (
          <Badge variant="secondary" className="mb-4">
            {post.categoryTitle}
          </Badge>
        )}

        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {post.author?.name && <span>{post.author.name}</span>}
            {publishedLabel && (
              <span>
                {post.author?.name ? " · " : ""}
                Published {publishedLabel}
              </span>
            )}
            {showUpdated && updatedLabel && (
              <span> · Updated {updatedLabel}</span>
            )}
          </p>
        </header>

        {heroUrl && (
          <figure className="mb-10 overflow-hidden rounded-xl border">
            <Image
              src={heroUrl}
              alt={heroAlt ?? post.title}
              width={1200}
              height={675}
              className="h-auto w-full object-cover"
              priority
            />
          </figure>
        )}

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
            <PortableText
              value={post.tldr}
              className="mt-3 text-sm leading-relaxed text-foreground"
            />
          </aside>
        ) : null}

        {post.body ? (
          <div className="prose-blog max-w-none">
            <PortableText value={post.body as PortableTextBlock[]} />
          </div>
        ) : null}

        {faqItems.length > 0 && (
          <section className="mt-12" aria-labelledby="post-faq-heading">
            <h2 id="post-faq-heading" className="text-2xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {faqItems.map((item) => (
                <div key={item.question}>
                  <dt className="text-base font-semibold">{item.question}</dt>
                  <dd className="mt-2 text-muted-foreground">
                    {item.answer?.length ? (
                      <PortableText value={item.answer} className="text-sm" />
                    ) : (
                      <p className="text-sm">{item.answerText}</p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {relatedCards.length > 0 && (
          <section className="mt-12" aria-labelledby="post-related-heading">
            <h2
              id="post-related-heading"
              className="mb-6 text-2xl font-bold tracking-tight"
            >
              Related articles
            </h2>
            <PostList posts={relatedCards} variant="horizontal" />
          </section>
        )}
      </article>
    </main>
  );
}
