import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import {
  fetchSearchPage,
  getSearchRobots,
  parseSearchFilters,
  parseSearchPage,
  parseSearchQuery,
} from "@/lib/blog-search";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const query = parseSearchQuery(await searchParams);
  const title = query
    ? `Search results for “${query}” | PakFactory Blog`
    : "Search | PakFactory Blog";
  const description = query
    ? `Blog articles matching “${query}”.`
    : "Search PakFactory Blog for packaging insights, trends, and guides.";

  return {
    title,
    description,
    // Empty, results, and zero-results are all noindex, follow (PROD-1503).
    robots: robotsDirectiveToMetadata(getSearchRobots()),
    alternates: { canonical: absoluteUrl("/search") },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = parseSearchQuery(sp);
  const filters = parseSearchFilters(sp);
  const pageNumber = parseSearchPage(sp);
  const data = await fetchSearchPage(query, pageNumber, filters);

  return <SearchView data={data} />;
}
