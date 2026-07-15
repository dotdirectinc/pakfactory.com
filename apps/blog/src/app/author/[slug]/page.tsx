import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorArchiveView } from "@/components/views/author-archive-view";
import { parsePerPage } from "@/lib/blog-archive";
import { isArchivePageOutOfRange } from "@/lib/blog-archive-pagination";
import {
  authorPageHref,
  buildAuthorMetadata,
  fetchAuthorArchivePage,
  getAuthorListingRobots,
  isThinAuthor,
} from "@/lib/blog-author";
import { hasNonDefaultPerPage } from "@/lib/seo";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const perPage = parsePerPage(sp.perPage);
  const data = await fetchAuthorArchivePage(slug, 1, perPage);
  if (!data) return { title: "Author not found" };

  return buildAuthorMetadata(
    data.author,
    authorPageHref(slug, 1),
    getAuthorListingRobots(1, {
      hasNonDefaultPerPage: hasNonDefaultPerPage(sp),
      thinAuthor: isThinAuthor(data.author, data.totalCount),
    }),
  );
}

export default async function AuthorProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const perPage = parsePerPage(sp.perPage);
  const data = await fetchAuthorArchivePage(slug, 1, perPage);
  if (!data) notFound();
  if (isArchivePageOutOfRange(1, data.totalCount, perPage)) notFound();

  return <AuthorArchiveView data={data} />;
}
