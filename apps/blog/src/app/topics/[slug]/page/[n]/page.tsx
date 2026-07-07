import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopicArchiveView } from "@/components/views/topic-archive-view";
import {
  buildTagArchiveMetadata,
  fetchTagArchivePage,
  parseTagFilters,
  tagPageHref,
} from "@/lib/blog-tag-archive";
import {
  isArchivePageOutOfRange,
  paginatedEntityDescription,
  paginatedListTitle,
  resolvePaginationRoute,
} from "@/lib/blog-archive-pagination";
import { getTagListingRobots } from "@/lib/seo";

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
  const pagination = resolvePaginationRoute(raw, `/topics/${slug}`);
  if (pagination.status !== "ok") {
    return { title: "Topic | PakFactory Blog" };
  }

  const sp = await searchParams;
  const filters = parseTagFilters(sp);
  const data = await fetchTagArchivePage(slug, pagination.pageNumber, filters);
  if (!data) return { title: "Topic not found" };

  return buildTagArchiveMetadata(
    data.tag,
    tagPageHref(slug, pagination.pageNumber, filters),
    getTagListingRobots(pagination.pageNumber, sp, data.totalCount > 0, data.tag),
    {
      titleOverride: paginatedListTitle(data.tag.title, pagination.pageNumber),
      descriptionOverride: paginatedEntityDescription(
        data.tag.title,
        data.tag.descriptionText,
        pagination.pageNumber,
      ),
    },
  );
}

export default async function TopicArchivePaginatedPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, n: raw } = await params;
  const pagination = resolvePaginationRoute(raw, `/topics/${slug}`);
  if (pagination.status === "not-found") notFound();
  if (pagination.status === "redirect") redirect(pagination.href);

  const sp = await searchParams;
  const filters = parseTagFilters(sp);
  const data = await fetchTagArchivePage(slug, pagination.pageNumber, filters);

  if (!data) notFound();
  if (isArchivePageOutOfRange(pagination.pageNumber, data.totalCount)) {
    notFound();
  }

  return <TopicArchiveView data={data} />;
}
