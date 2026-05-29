import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TagArchiveView } from "@/app/_components/tag-archive-view";
import {
  fetchTagArchivePage,
  isArchivePageOutOfRange,
  parseArchivePageParam,
  parseTagFilters,
  tagPageHref,
} from "@/lib/blog-tag-archive";
import { getTagListingRobots, robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

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
  const pageNumber = parseArchivePageParam(raw);
  if (pageNumber === null || pageNumber === 1) {
    return { title: "Tag | PakFactory Blog" };
  }

  const sp = await searchParams;
  const filters = parseTagFilters(sp);
  const data = await fetchTagArchivePage(slug, pageNumber, filters);
  if (!data) return { title: "Tag not found" };

  const canonical = absoluteUrl(tagPageHref(slug, pageNumber, filters));
  const title = `${data.tag.title} — Page ${pageNumber} | PakFactory Blog`;
  const description =
    data.tag.metaDescription?.trim() ||
    data.tag.descriptionText?.trim().slice(0, 160) ||
    `Page ${pageNumber} of articles tagged ${data.tag.title} on PakFactory Blog.`;

  return {
    title,
    description,
    robots: robotsDirectiveToMetadata(
      getTagListingRobots(pageNumber, sp, data.totalCount > 0, data.tag),
    ),
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function TagArchivePaginatedPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, n: raw } = await params;
  const pageNumber = parseArchivePageParam(raw);

  if (pageNumber === null) notFound();
  if (pageNumber === 1) redirect(`/tag/${slug}`);

  const sp = await searchParams;
  const filters = parseTagFilters(sp);
  const data = await fetchTagArchivePage(slug, pageNumber, filters);

  if (!data) notFound();
  if (isArchivePageOutOfRange(pageNumber, data.totalCount)) notFound();

  return <TagArchiveView data={data} />;
}
