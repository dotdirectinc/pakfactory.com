import type { Metadata } from "next";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDIES_LISTING_QUERY,
  type CaseStudyCard as CaseStudyCardData,
} from "@pakfactory/sanity/queries";
import {
  breadcrumbList,
  collectionPage,
  itemList,
  jsonLdGraph,
  serializeJsonLd,
} from "@pakfactory/seo";
import { absoluteUrl } from "@/lib/site";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";
import { CaseStudyListingGrid } from "./_components/case-study-listing-grid";

export const revalidate = 3600;

const PAGE_URL = absoluteUrl("/case-studies");

export const metadata: Metadata = {
  title: "Case Studies | PakFactory",
  description:
    "See how PakFactory has helped brands create custom packaging that protects products and elevates unboxing experiences.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Case Studies | PakFactory",
    description:
      "See how PakFactory has helped brands create custom packaging that protects products and elevates unboxing experiences.",
    url: PAGE_URL,
  },
};

export default async function CaseStudiesPage() {
  const studies = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudyCardData[]>(CASE_STUDIES_LISTING_QUERY)
        .catch(() => [] as CaseStudyCardData[])
    : ([] as CaseStudyCardData[]);

  const jsonLd = serializeJsonLd(
    jsonLdGraph([
      breadcrumbList([
        { name: "Home", url: absoluteUrl("/") },
        { name: "Case Studies", url: PAGE_URL },
      ]),
      collectionPage({
        name: "Case Studies | PakFactory",
        url: PAGE_URL,
        description:
          "See how PakFactory has helped brands create custom packaging that protects products and elevates unboxing experiences.",
      }),
      itemList({
        name: "Case Studies",
        items: studies.map((s) => ({
          name: s.title,
          url: absoluteUrl(`/case-studies/${s.slug}`),
        })),
      }),
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* Hero */}
      <PageDielineSection
        className="border-b border-dashed border-border"
        innerClassName="flex flex-col gap-4 py-16 text-foreground"
      >
        <p className="text-lg font-semibold leading-7">WORK WE&apos;RE PROUD OF</p>
        <h1 className="text-[36px] font-semibold leading-10 tracking-tight">
          Real brands. Real packaging. Real results.
        </h1>
        <p className="max-w-[1141px] text-xl leading-7 text-muted-foreground">
          From first launches to established brands, these stories show how thoughtful
          packaging can solve real business challenges and create memorable customer
          experiences.
        </p>
      </PageDielineSection>

      {/* Filter bar + grid — client component handles all interactive state */}
      {studies.length === 0 ? (
        <PageDielineSection innerClassName="py-12">
          <p className="text-sm text-muted-foreground">Case studies coming soon.</p>
        </PageDielineSection>
      ) : (
        <CaseStudyListingGrid studies={studies} />
      )}
    </>
  );
}
