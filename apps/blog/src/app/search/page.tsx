import type { Metadata } from "next";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SearchTracker } from "@/components/modules/analytics/search-tracker";
import {
  PageDielineBlockRail,
  PageDielineSection,
} from "@/components/layout/page-dieline-section";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { PageHeader } from "@/components/modules/page-header";
import { SearchListingClient } from "@/components/modules/search-listing-client";
import { TopicChipRow } from "@/components/ui/topic-chip-row";
import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import { tagHref } from "@/lib/blog-post-url";
import {
  fetchBlogCategories,
  fetchBlogSearchPage,
} from "@/lib/blog-data";
import { parsePerPage } from "@/lib/blog-archive";
import {
  buildBlogSearchMetadata,
  fetchSearchPage,
  parseSearchFilters,
  parseSearchPage,
  parseSearchQuery,
} from "@/lib/blog-search";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CRUMBS = [{ label: "Blog", href: "/" }, { label: "Search" }];

function hasNewsletterBlock(blocks: PageBuilderBlock[]): boolean {
  return blocks.some((block) => block._type === "ctaNewsletter");
}

/** CMS page-builder blocks when present; otherwise a hardcoded newsletter CTA. */
function SearchBelowFold({ blocks }: { blocks: PageBuilderBlock[] }) {
  if (blocks.length > 0) {
    return (
      <>
        <BlockRenderer blocks={blocks} />
        {!hasNewsletterBlock(blocks) && (
          <PageDielineBlockRail>
            <CtaNewsletter showTopBorder={false} showBottomBorder={false} />
          </PageDielineBlockRail>
        )}
      </>
    );
  }

  return (
    <PageDielineBlockRail>
      <CtaNewsletter showTopBorder={false} showBottomBorder={false} />
    </PageDielineBlockRail>
  );
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const query = parseSearchQuery(await searchParams);
  const searchPage = await fetchBlogSearchPage();
  return buildBlogSearchMetadata(query, searchPage);
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = parseSearchQuery(sp);
  const filters = parseSearchFilters(sp);
  const pageNumber = parseSearchPage(sp);
  const perPage = parsePerPage(sp.perPage);
  const [data, searchPage] = await Promise.all([
    fetchSearchPage(query, pageNumber, filters, perPage),
    fetchBlogSearchPage(),
  ]);
  const { allPosts, pageNumber: currentPage } = data;
  const { topics: recommendedTopics, blocks } = searchPage;

  const headerTitle = query ? `Search Results for: “${query}”` : "Search the blog";

  const header = (
    <>
      <SearchTracker
        query={query}
        resultsCount={allPosts.length}
        page={currentPage}
      />
      <PageDielineSection innerClassName="py-4">
        <Breadcrumb items={CRUMBS} />
      </PageDielineSection>
      <PageHeader title={headerTitle} />
    </>
  );

  // ── Results state (any matches for q — filters can still empty the grid) ──
  if (query && allPosts.length > 0) {
    const categories = await fetchBlogCategories();
    const categoryOptions = categories.map((category) => ({
      value: category.slug,
      label: category.title,
    }));

    return (
      <main>
        {header}
        <PageDielineSection innerClassName="py-16 sm:py-24">
          <SearchListingClient
            query={query}
            allPosts={allPosts}
            categoryOptions={categoryOptions}
            initialFilters={filters}
            initialPage={pageNumber}
            initialPerPage={perPage}
          />
        </PageDielineSection>
        <SearchBelowFold blocks={blocks} />
      </main>
    );
  }

  // ── No-results (and empty-query) state ─────────────────────────────────────
  const topics = recommendedTopics
    .filter((topic) => topic.slug?.trim())
    .map((topic) => ({
      key: topic._id ?? topic.slug,
      title: topic.title,
      href: tagHref(topic.slug),
    }));

  return (
    <main>
      {header}
      <PageDielineSection innerClassName="py-16 sm:py-24">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {query ? `No results for “${query}”` : "Start your search"}
            </h2>
            <p className="max-w-[720px] text-lg leading-7 text-muted-foreground">
              {query
                ? "We couldn’t find any matching posts. Try a broader term, double-check the spelling, or browse one of our topics below."
                : "Use the search bar above to find packaging insights, trends, and guides — or browse a popular topic below."}
            </p>
          </div>
          {topics.length > 0 && (
            <TopicChipRow
              label="Recommended topics:"
              topics={topics}
              exploreHref="/topics"
            />
          )}
        </div>
      </PageDielineSection>
      <SearchBelowFold blocks={blocks} />
    </main>
  );
}
