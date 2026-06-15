import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TagArchiveView } from "@/components/views/tag-archive-view";
import {
  fetchTagArchivePage,
  parseTagFilters,
  tagPageHref,
} from "@/lib/blog-tag-archive";
import { getTagListingRobots, robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

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
  const filters = parseTagFilters(sp);
  const data = await fetchTagArchivePage(slug, 1, filters);
  if (!data) return { title: "Tag not found" };

  const canonical = absoluteUrl(tagPageHref(slug, 1, filters));
  const title =
    data.tag.metaTitle?.trim() || `Posts about ${data.tag.title} | PakFactory Blog`;
  const description =
    data.tag.metaDescription?.trim() ||
    data.tag.descriptionText?.trim().slice(0, 160) ||
    `Browse articles tagged ${data.tag.title} on PakFactory Blog.`;

  return {
    title,
    description,
    robots: robotsDirectiveToMetadata(
      getTagListingRobots(1, sp, data.totalCount > 0, data.tag),
    ),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(data.tag.ogImageUrl ? { images: [{ url: data.tag.ogImageUrl }] } : {}),
    },
    twitter: {
      card: data.tag.ogImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(data.tag.ogImageUrl ? { images: [data.tag.ogImageUrl] } : {}),
    },
  };
}

export default async function TagArchivePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const filters = parseTagFilters(sp);
  const data = await fetchTagArchivePage(slug, 1, filters);

  if (!data) notFound();

  return <TagArchiveView data={data} />;
}
