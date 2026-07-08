import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthorArchiveView } from "@/components/views/author-archive-view";
import {
  isArchivePageOutOfRange,
  paginatedEntityDescription,
  paginatedListTitle,
  resolvePaginationRoute,
} from "@/lib/blog-archive-pagination";
import {
  authorPageHref,
  buildAuthorMetadata,
  fetchAuthorArchivePage,
  getAuthorListingRobots,
} from "@/lib/blog-author";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string; n: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, n: raw } = await params;
  const pagination = resolvePaginationRoute(raw, authorPageHref(slug, 1));
  if (pagination.status !== "ok") {
    return { title: "Author | PakFactory Blog" };
  }

  const data = await fetchAuthorArchivePage(slug, pagination.pageNumber);
  if (!data) return { title: "Author not found" };

  const description =
    data.author.shortBio?.trim() ||
    data.author.bioText?.trim().slice(0, 160) ||
    undefined;

  return buildAuthorMetadata(
    data.author,
    authorPageHref(slug, pagination.pageNumber),
    getAuthorListingRobots(pagination.pageNumber),
    {
      titleOverride: paginatedListTitle(data.author.name, pagination.pageNumber),
      descriptionOverride: paginatedEntityDescription(
        data.author.name,
        description,
        pagination.pageNumber,
      ),
    },
  );
}

export default async function AuthorArchivePaginatedPage({ params }: PageProps) {
  const { slug, n: raw } = await params;
  const pagination = resolvePaginationRoute(raw, authorPageHref(slug, 1));
  if (pagination.status === "not-found") notFound();
  if (pagination.status === "redirect") redirect(pagination.href);

  const data = await fetchAuthorArchivePage(slug, pagination.pageNumber);
  if (!data) notFound();
  if (isArchivePageOutOfRange(pagination.pageNumber, data.totalCount)) {
    notFound();
  }

  return <AuthorArchiveView data={data} />;
}
