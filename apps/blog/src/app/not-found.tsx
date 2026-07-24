import type { Metadata } from "next";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { NotFoundHero } from "@/components/modules/not-found-hero";
import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import { PageDielineBlockRail } from "@/components/layout/page-dieline-section";
import { fetchBlogNotFoundPage } from "@/lib/blog-data";
import { buildBlogNotFoundMetadata } from "@/lib/blog-not-found-page";

export async function generateMetadata(): Promise<Metadata> {
  const notFoundPage = await fetchBlogNotFoundPage();
  return buildBlogNotFoundMetadata(notFoundPage);
}

/**
 * Blog 404 (PROD-1896) — real HTTP 404 (Next serves this with a 404 status),
 * noindex via metadata, inside the blog chrome with no breadcrumb. Fixed recovery
 * hero; body is page-builder-driven via BlockRenderer + newsletter CTA.
 */
export default async function NotFound() {
  const notFoundPage = await fetchBlogNotFoundPage();

  return (
    <>
      <NotFoundHero topics={notFoundPage.topics} />
      <PageDielineBlockRail>
        <BlockRenderer blocks={notFoundPage.blocks} />
      </PageDielineBlockRail>
      <CtaNewsletter showTopBorder={false} showBottomBorder={false} />
    </>
  );
}
