import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArchiveView } from "@/components/views/topic-archive-view";
import { parsePerPage } from "@/lib/blog-archive";
import {
  buildTagArchiveMetadata,
  fetchTagArchivePage,
  parseTagFilters,
  tagPageHref,
} from "@/lib/blog-tag-archive";
import { fetchBlogCategories } from "@/lib/blog-data";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import { getTagListingRobots } from "@/lib/seo";

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
  const perPage = parsePerPage(sp.perPage);
  const [data, seoCtx] = await Promise.all([
    fetchTagArchivePage(slug, 1, filters, perPage),
    fetchSeoContext(),
  ]);
  if (!data) return { title: "Topic not found" };

  const tagDefaults = typeDefaults(seoCtx, "tagDefaults");
  return buildTagArchiveMetadata(
    data.tag,
    tagPageHref(slug, 1, filters),
    getTagListingRobots(1, sp, data.totalCount > 0, data.tag, {
      postCount: data.totalCount,
      autoNoindexThreshold: tagDefaults?.autoNoindexThreshold,
    }),
  );
}

export default async function TopicArchivePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const filters = parseTagFilters(sp);
  const perPage = parsePerPage(sp.perPage);
  const [data, categories] = await Promise.all([
    fetchTagArchivePage(slug, 1, filters, perPage),
    fetchBlogCategories(),
  ]);

  if (!data) notFound();

  const categoryOptions = categories.map((c) => ({
    value: c.slug,
    label: c.navLabel?.trim() || c.title,
  }));

  return <TopicArchiveView data={data} categoryOptions={categoryOptions} />;
}
