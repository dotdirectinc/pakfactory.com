import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorArchiveView } from "@/components/views/author-archive-view";
import { isArchivePageOutOfRange } from "@/lib/blog-archive-pagination";
import {
  authorPageHref,
  buildAuthorMetadata,
  fetchAuthorArchivePage,
  getAuthorListingRobots,
} from "@/lib/blog-author";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchAuthorArchivePage(slug, 1);
  if (!data) return { title: "Author not found" };

  return buildAuthorMetadata(
    data.author,
    authorPageHref(slug, 1),
    getAuthorListingRobots(1),
  );
}

export default async function AuthorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchAuthorArchivePage(slug, 1);
  if (!data) notFound();
  if (isArchivePageOutOfRange(1, data.totalCount)) notFound();

  return <AuthorArchiveView data={data} />;
}
