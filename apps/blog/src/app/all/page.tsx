import type { Metadata } from "next";
import { AllArchiveView } from "@/components/views/all-archive-view";
import { fetchAllArchivePage, parsePerPage } from "@/lib/blog-archive";
import {
  getAllArchiveRobots,
  hasNonDefaultPerPage,
  robotsDirectiveToMetadata,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

const ARCHIVE_TITLE = "All posts | PakFactory Blog";
const ARCHIVE_DESCRIPTION =
  "Browse every PakFactory blog article in chronological order.";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const canonical = absoluteUrl("/all");

  return {
    title: ARCHIVE_TITLE,
    description: ARCHIVE_DESCRIPTION,
    robots: robotsDirectiveToMetadata(
      getAllArchiveRobots(1, {
        hasNonDefaultPerPage: hasNonDefaultPerPage(sp),
      }),
    ),
    alternates: { canonical },
    openGraph: {
      title: ARCHIVE_TITLE,
      description: ARCHIVE_DESCRIPTION,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: ARCHIVE_TITLE,
      description: ARCHIVE_DESCRIPTION,
    },
  };
}

export default async function AllPostsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const perPage = parsePerPage(sp.perPage);
  const data = await fetchAllArchivePage(1, perPage);
  return <AllArchiveView data={data} />;
}
