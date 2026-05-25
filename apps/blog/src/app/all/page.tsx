import type { Metadata } from "next";
import { AllPostsArchive } from "@/app/_components/all-posts-archive";
import { fetchAllArchivePage } from "@/lib/blog-archive";
import {
  getAllArchiveRobots,
  robotsDirectiveToMetadata,
} from "@/lib/seo";
import { getSiteUrl, normalizeSiteUrl } from "@/lib/site";

export const revalidate = 60;

const ARCHIVE_TITLE = "All posts | PakFactory Blog";
const ARCHIVE_DESCRIPTION =
  "Browse every PakFactory blog article in chronological order.";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = normalizeSiteUrl(getSiteUrl());
  const canonical = `${siteUrl}/all`;

  return {
    title: ARCHIVE_TITLE,
    description: ARCHIVE_DESCRIPTION,
    robots: robotsDirectiveToMetadata(getAllArchiveRobots(1)),
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

export default async function AllPostsPage() {
  const data = await fetchAllArchivePage(1);
  return <AllPostsArchive data={data} />;
}
