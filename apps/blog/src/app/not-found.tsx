import type { Metadata } from "next";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { NotFoundHero } from "@/components/modules/not-found-hero";
import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import { fetchBlogNotFoundPage } from "@/lib/blog-data";
import {
  getBlogRobotsDirective,
  robotsDirectiveToMetadata,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Page not found | PakFactory Blog",
  description:
    "This page does not exist. Explore topics or head back to the blog home.",
  robots: robotsDirectiveToMetadata(getBlogRobotsDirective({ kind: "error" })),
};

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
      <BlockRenderer blocks={notFoundPage.blocks} />
      <CtaNewsletter showTopBorder={false} showBottomBorder={false} />
    </>
  );
}
