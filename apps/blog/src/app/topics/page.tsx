import type { Metadata } from "next";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { PageDielineBlockRail } from "@/components/layout/page-dieline-section";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/modules/page-header";
import { TopicsGrid } from "@/components/modules/topic-grid";
import {
  CategoryLandingLayout,
  CategoryLandingSection,
} from "@/components/views/category-landing-layout";
import { fetchTopicsIndex } from "@/lib/blog-topics-index";
import {
  buildBlogTopicsMetadata,
  fetchBlogTopicsPage,
  resolveTopicsPageDescription,
  resolveTopicsPageJsonLdDescription,
  resolveTopicsPageTitle,
} from "@/lib/blog-topics-page";
import { getBlogRobotsDirective } from "@/lib/seo";
import { buildTopicsIndexJsonLd } from "@/lib/topics-index-jsonld";
import { getBlogHomeDebugInfo } from "@/lib/blog-home";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const group = firstParam((await searchParams).group);
  const topicsPage = await fetchBlogTopicsPage();
  const robots = getBlogRobotsDirective({
    kind: "tag",
    pageNumber: 1,
    // The "view all" expanded state narrows the page → keep it out of the index.
    hasActiveFilters: Boolean(group),
  });

  return buildBlogTopicsMetadata(topicsPage, robots);
}

export default async function TopicsIndexPage({ searchParams }: PageProps) {
  const groupParam = firstParam((await searchParams).group);
  const topicsPage = await fetchBlogTopicsPage();
  const data = await fetchTopicsIndex(topicsPage?.topics);

  const jsonLd = buildTopicsIndexJsonLd(
    data.groups,
    resolveTopicsPageJsonLdDescription(topicsPage),
  );
  const pageTitle = resolveTopicsPageTitle(topicsPage);
  const pageDescription = resolveTopicsPageDescription(topicsPage);
  const blocks = topicsPage?.pageBuilder ?? [];
  const debug = getBlogHomeDebugInfo();
  const showDevEmptyHint =
    process.env.NODE_ENV === "development" && blocks.length === 0;

  return (
    <CategoryLandingLayout
      jsonLd={jsonLd}
      breadcrumb={
        <Breadcrumb
          items={[{ label: "Blog", href: "/" }, { label: pageTitle }]}
        />
      }
      header={
        <PageHeader title={pageTitle} descriptionText={pageDescription} />
      }
    >
      <CategoryLandingSection>
        {(topicsPage?.topics?.length ?? 0) === 0 ? (
          <p className="text-base text-muted-foreground">
            No topic groups have been added yet. Add groups on the Topic page in
            Studio, or publish a new topic group.
          </p>
        ) : (
          <TopicsGrid
            leftColumnGroups={data.leftColumnGroups}
            rightColumnGroups={data.rightColumnGroups}
            expandedSlug={groupParam}
          />
        )}
      </CategoryLandingSection>

      {showDevEmptyHint ? (
        <div
          className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          <p className="font-medium">Topics page builder is empty</p>
          <p className="mt-1 text-muted-foreground">
            Project: <code>{debug.projectId}</code> · Dataset:{" "}
            <code>{debug.dataset}</code> · Token:{" "}
            {debug.hasReadToken ? "set" : "missing"} · Configured:{" "}
            {debug.configured ? "yes" : "no"}
          </p>
          <p className="mt-2 text-muted-foreground">
            Open Studio → Pages → Topic page, or run{" "}
            <code>pnpm seed:blog-dev</code> on dataset{" "}
            <code>development</code>.
          </p>
        </div>
      ) : null}

      <PageDielineBlockRail>
        <BlockRenderer blocks={blocks} />
      </PageDielineBlockRail>
    </CategoryLandingLayout>
  );
}
