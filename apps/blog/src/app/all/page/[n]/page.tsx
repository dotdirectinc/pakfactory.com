import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AllArchiveView } from "@/components/views/all-archive-view";
import {
  archivePageHref,
  fetchAllArchivePage,
} from "@/lib/blog-archive";
import {
  isArchivePageOutOfRange,
  paginatedListTitle,
  resolvePaginationRoute,
} from "@/lib/blog-archive-pagination";
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
  const pagination = resolvePaginationRoute(raw, "/all");
  if (pagination.status !== "ok") {
    return { title: "All posts | PakFactory Blog" };
  }

  const canonical = absoluteUrl(archivePageHref(pagination.pageNumber));
  const title = paginatedListTitle("All posts", pagination.pageNumber);

  return {
    title,
    description: ARCHIVE_DESCRIPTION,
    robots: robotsDirectiveToMetadata(getAllArchiveRobots(pagination.pageNumber)),
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
  const pagination = resolvePaginationRoute(raw, "/all");
  if (pagination.status === "not-found") notFound();
  if (pagination.status === "redirect") redirect(pagination.href);

  const data = await fetchAllArchivePage(pagination.pageNumber);
  if (isArchivePageOutOfRange(pagination.pageNumber, data.totalCount)) {
    notFound();
  }

  return <AllArchiveView data={data} />;
}
