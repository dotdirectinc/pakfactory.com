import type { Metadata } from "next";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SearchTracker } from "@/components/modules/analytics/search-tracker";
import {
  PageDielineBlockRail,
  PageDielineSection,
} from "@/components/layout/page-dieline-section";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { PageHeader } from "@/components/modules/page-header";
import { SearchFilterBar } from "@/components/modules/search-filter-bar";
import { PostList } from "@/components/modules/post-list";
import { Pagination, LISTING_TOP_ID } from "@/components/modules/pagination";
import { TopicChipRow } from "@/components/ui/topic-chip-row";
import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import { toPostCardDataList } from "@/lib/post-card-data";
import { tagHref } from "@/lib/blog-post-url";
import {
  fetchBlogCategories,
  fetchBlogSearchPage,
} from "@/lib/blog-data";
import {
  PAGE_SIZE_OPTIONS,
  parsePerPage,
} from "@/lib/blog-archive";
import {
  buildBlogSearchMetadata,
  fetchSearchPage,
  parseSearchFilters,
  parseSearchPage,
  parseSearchQuery,
  searchPageHref,
} from "@/lib/blog-search";
import { PerPageSelect } from "@/components/modules/per-page-select";

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
  const { posts, totalCount, totalPages } = data;
  const { topics: recommendedTopics, blocks } = searchPage;

  const headerTitle = query ? `Search Results for: “${query}”` : "Search the blog";

  const header = (
    <>
      <SearchTracker query={query} resultsCount={totalCount} page={pageNumber} />
      <PageDielineSection innerClassName="py-4">
        <Breadcrumb items={CRUMBS} />
      </PageDielineSection>
      <PageHeader title={headerTitle} />
    </>
  );

  // ── Results state ──────────────────────────────────────────────────────────
  if (query && totalCount > 0) {
    const categories = await fetchBlogCategories();
    const categoryOptions = categories.map((category) => ({
      value: category.slug,
      label: category.title,
    }));

    return (
      <main>
        {header}
        <PageDielineSection innerClassName="py-16 sm:py-24">
          <SearchFilterBar
            query={query}
            filters={filters}
            categoryOptions={categoryOptions}
          />
          <div id={LISTING_TOP_ID} className="scroll-mt-24 mt-12">
            <PostList
              posts={toPostCardDataList(posts)}
              columns={3}
              priorityFirst
              emptyMessage="No posts on this page."
            />
          </div>
          {totalCount > 0 && (
            <div className="py-16">
              <Pagination
                pageNumber={pageNumber}
                totalPages={totalPages}
                hrefForPage={(page) =>
                  searchPageHref(query, page, filters, perPage)
                }
                ariaLabel="Search results pagination"
                scrollTargetId={LISTING_TOP_ID}
                rightSlot={
                  <PerPageSelect
                    value={perPage}
                    options={PAGE_SIZE_OPTIONS.map((size) => ({
                      size,
                      href: searchPageHref(query, 1, filters, size),
                    }))}
                  />
                }
              />
            </div>
          )}
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
