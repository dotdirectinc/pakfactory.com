import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorHeader } from "@/components/views/author-header";
import { AuthorPostsLoader } from "@/components/modules/author-posts-loader";
import { buildAuthorJsonLd } from "@/lib/author-jsonld";
import {
  buildAuthorMetadata,
  fetchAuthorBySlug,
  fetchAuthorPostsPage,
} from "@/lib/blog-author";
import { sanityImageUrl } from "@/lib/sanity-image";
import { getBlogRobotsDirective } from "@/lib/seo";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await fetchAuthorBySlug(slug);
  if (!author) return { title: "Author not found" };

  return buildAuthorMetadata(author, getBlogRobotsDirective({ kind: "author" }));
}

export default async function AuthorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const author = await fetchAuthorBySlug(slug);
  if (!author) notFound();

  const { posts, hasMore } = await fetchAuthorPostsPage(slug, 0);
  const photoUrl = sanityImageUrl(author.photo, 400);
  const jsonLd = buildAuthorJsonLd(author, photoUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <AuthorHeader author={author} />
        <section aria-labelledby="author-posts">
          <h2 id="author-posts" className="mb-6 text-lg font-semibold tracking-tight">
            Articles by {author.name}
          </h2>
          <AuthorPostsLoader
            authorSlug={author.slug}
            initialPosts={posts}
            initialHasMore={hasMore}
          />
        </section>
      </main>
    </>
  );
}
