import type { Metadata } from "next";
import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDIES_LISTING_QUERY,
  CASE_STUDIES_PAGE_QUERY,
  type CaseStudyCard as CaseStudyCardData,
  type CaseStudiesPageData,
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

const FALLBACK_TITLE = "Case Studies | PakFactory";
const FALLBACK_DESCRIPTION =
  "See how PakFactory has helped brands create custom packaging that protects products and elevates unboxing experiences.";

export async function generateMetadata(): Promise<Metadata> {
  const pageData = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudiesPageData | null>(CASE_STUDIES_PAGE_QUERY)
        .catch(() => null)
    : null;

  const title = pageData?.metaTitle?.trim() || FALLBACK_TITLE;
  const description = pageData?.metaDescription?.trim() || FALLBACK_DESCRIPTION;
  const ogImageUrl = pageData?.ogImageUrl;

  return {
    title,
    description,
    alternates: { canonical: PAGE_URL },
    openGraph: {
      title,
      description,
      url: PAGE_URL,
      ...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
    },
  };
}

export default async function CaseStudiesPage() {
  const client = isSanityConfigured() ? getPublishedSanityClient() : null;

  const [studies, pageData] = await Promise.all([
    client
      ? client
          .fetch<CaseStudyCardData[]>(CASE_STUDIES_LISTING_QUERY)
          .catch(() => [] as CaseStudyCardData[])
      : Promise.resolve([] as CaseStudyCardData[]),
    client
      ? client
          .fetch<CaseStudiesPageData | null>(CASE_STUDIES_PAGE_QUERY)
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const eyebrow = pageData?.heroEyebrow?.trim() || "WORK WE’RE PROUD OF";
  const heading =
    pageData?.heroHeading?.trim() || "Real brands. Real packaging. Real results.";
  const heroIntro = pageData?.heroIntro;
  const hasHeroIntro = Array.isArray(heroIntro) && heroIntro.length > 0;
  const FALLBACK_INTRO = "From first launches to established brands, these stories show how thoughtful packaging can solve real business challenges and create memorable customer experiences.";

  const jsonLd = serializeJsonLd(
    jsonLdGraph([
      breadcrumbList([
        { name: "Home", url: absoluteUrl("/") },
        { name: "Case Studies", url: PAGE_URL },
      ]),
      collectionPage({
        name: FALLBACK_TITLE,
        url: PAGE_URL,
        description: FALLBACK_DESCRIPTION,
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
        <p className="text-lg font-semibold leading-7">{eyebrow}</p>
        <h1 className="text-[36px] font-semibold leading-10 tracking-tight">
          {heading}
        </h1>
        {hasHeroIntro ? (
          <div className="max-w-[1141px] text-xl leading-7 text-muted-foreground">
            <PortableText
              value={heroIntro as PortableTextBlock[]}
              components={{
                block: { normal: ({ children }) => <p className="text-xl leading-7 text-muted-foreground">{children}</p> },
                marks: {
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  link: ({ value, children }) => (
                    <a href={value?.href} className="underline underline-offset-4 hover:no-underline" target="_blank" rel="noopener noreferrer">{children}</a>
                  ),
                },
              }}
            />
          </div>
        ) : (
          <p className="max-w-[1141px] text-xl leading-7 text-muted-foreground">{FALLBACK_INTRO}</p>
        )}
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
