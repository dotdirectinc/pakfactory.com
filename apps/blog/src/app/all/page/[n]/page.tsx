import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AllArchiveView } from "@/components/views/all-archive-view";
import {
  archivePageHref,
  fetchAllArchivePage,
  isArchivePageOutOfRange,
  parseArchivePageParam,
} from "@/lib/blog-archive";
import {
  getAllArchiveRobots,
  robotsDirectiveToMetadata,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

const ARCHIVE_DESCRIPTION =
  "Browse every PakFactory blog article in chronological order.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n: raw } = await params;
  const pageNumber = parseArchivePageParam(raw);
  if (pageNumber === null || pageNumber === 1) {
    return { title: "All posts | PakFactory Blog" };
  }

  const canonical = absoluteUrl(archivePageHref(pageNumber));
  const title = `All posts — Page ${pageNumber} | PakFactory Blog`;

  return {
    title,
    description: ARCHIVE_DESCRIPTION,
    robots: robotsDirectiveToMetadata(getAllArchiveRobots(pageNumber)),
    alternates: { canonical },
    openGraph: {
      title,
      description: ARCHIVE_DESCRIPTION,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description: ARCHIVE_DESCRIPTION,
    },
  };
}

export default async function AllPostsPaginatedPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n: raw } = await params;
  const pageNumber = parseArchivePageParam(raw);

  if (pageNumber === null) notFound();
  if (pageNumber === 1) redirect("/all");

  const data = await fetchAllArchivePage(pageNumber);
  if (isArchivePageOutOfRange(pageNumber, data.totalCount)) notFound();

  return <AllArchiveView data={data} />;
}
