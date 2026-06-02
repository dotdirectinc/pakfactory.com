import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorHeader } from "@/app/author/[slug]/_components/author-header";
import { AuthorPostsLoader } from "@/app/author/[slug]/_components/posts-loader";
import { buildAuthorJsonLd } from "@/lib/author-jsonld";
import {
  fetchAuthorBySlug,
  fetchAuthorPostsPage,
} from "@/lib/blog-author";
import { authorHref } from "@/lib/blog-post-url";
import { sanityImageUrl } from "@/lib/sanity-image";
import { getBlogRobotsDirective, robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await fetchAuthorBySlug(slug);
  if (!author) return { title: "Author not found" };

  const canonical = absoluteUrl(authorHref(slug));
  const title = `${author.name} | PakFactory Blog`;
  const description =
    author.bioText?.trim().slice(0, 160) ||
    author.role ||
    `Articles by ${author.name} on PakFactory Blog.`;
  const photoUrl = sanityImageUrl(author.photo, 400);

  return {
    title,
    description,
    robots: robotsDirectiveToMetadata(getBlogRobotsDirective({ kind: "author" })),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      ...(photoUrl ? { images: [{ url: photoUrl }] } : {}),
    },
    twitter: {
      card: photoUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(photoUrl ? { images: [photoUrl] } : {}),
    },
  };
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
