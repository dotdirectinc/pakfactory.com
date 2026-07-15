import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthorArchiveView } from "@/components/views/author-archive-view";
import { parsePerPage } from "@/lib/blog-archive";
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
  isThinAuthor,
} from "@/lib/blog-author";
import { hasNonDefaultPerPage } from "@/lib/seo";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string; n: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug, n: raw } = await params;
  const pagination = resolvePaginationRoute(raw, authorPageHref(slug, 1));
  if (pagination.status !== "ok") {
    return { title: "Author | PakFactory Blog" };
  }

  const sp = await searchParams;
  const perPage = parsePerPage(sp.perPage);
  const data = await fetchAuthorArchivePage(slug, pagination.pageNumber, perPage);
  if (!data) return { title: "Author not found" };

  const description =
    data.author.shortBio?.trim() ||
    data.author.bioText?.trim().slice(0, 160) ||
    undefined;

  return buildAuthorMetadata(
    data.author,
    authorPageHref(slug, pagination.pageNumber),
    getAuthorListingRobots(pagination.pageNumber, {
      hasNonDefaultPerPage: hasNonDefaultPerPage(sp),
      thinAuthor: isThinAuthor(data.author, data.totalCount),
    }),
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

export default async function AuthorArchivePaginatedPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, n: raw } = await params;
  const pagination = resolvePaginationRoute(raw, authorPageHref(slug, 1));
  if (pagination.status === "not-found") notFound();
  if (pagination.status === "redirect") redirect(pagination.href);

  const sp = await searchParams;
  const perPage = parsePerPage(sp.perPage);
  const data = await fetchAuthorArchivePage(slug, pagination.pageNumber, perPage);
  if (!data) notFound();
  if (isArchivePageOutOfRange(pagination.pageNumber, data.totalCount, perPage)) {
    notFound();
  }

  return <AuthorArchiveView data={data} />;
}
