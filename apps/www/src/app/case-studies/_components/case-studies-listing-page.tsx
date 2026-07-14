import type { Metadata } from "next";
import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { getPublishedSanityClient, getSanityClient } from "@/lib/sanity/client";
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
import { pakfactoryOrganization } from "@/lib/case-study-jsonld";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";
import { CaseStudyListingGrid } from "./case-study-listing-grid";
import {
  CASE_STUDIES_BASE_PATH,
} from "./case-studies-listing-constants";

export { CASE_STUDIES_BASE_PATH, CASE_STUDIES_LISTING_TOP_ID } from "./case-studies-listing-constants";

const PAGE_URL = absoluteUrl(CASE_STUDIES_BASE_PATH);

const FALLBACK_TITLE = "Case Studies | PakFactory";
const FALLBACK_DESCRIPTION =
  "See how PakFactory has helped brands create custom packaging that protects products and elevates unboxing experiences.";

type ListingData = {
  studies: CaseStudyCardData[];
  pageData: CaseStudiesPageData | null;
};

export async function fetchCaseStudiesListing(): Promise<ListingData> {
  const client = isSanityConfigured() ? await getSanityClient() : null;

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

  return { studies, pageData };
}

export async function buildCaseStudiesListingMetadata(
  pageNumber = 1,
): Promise<Metadata> {
  const pageData = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudiesPageData | null>(CASE_STUDIES_PAGE_QUERY)
        .catch(() => null)
    : null;

  const title = pageData?.metaTitle?.trim() || FALLBACK_TITLE;
  const description = pageData?.metaDescription?.trim() || FALLBACK_DESCRIPTION;
  const ogImageUrl = pageData?.ogImageUrl;

  return {
    title:
      pageNumber > 1 ? `${title.replace(/\s*\|\s*PakFactory$/, "")} — Page ${pageNumber} | PakFactory` : title,
    description,
    alternates: { canonical: PAGE_URL },
    robots:
      pageNumber > 1 ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: PAGE_URL,
      ...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
    },
  };
}

type CaseStudiesListingPageProps = {
  initialPage?: number;
};

export async function CaseStudiesListingPage({
  initialPage = 1,
}: CaseStudiesListingPageProps) {
  const { studies, pageData } = await fetchCaseStudiesListing();

  const eyebrow = pageData?.heroEyebrow?.trim() || "WORK WE’RE PROUD OF";
  const heading =
    pageData?.heroHeading?.trim() || "Real brands. Real packaging. Real results.";
  const heroIntro = pageData?.heroIntro;
  const hasHeroIntro = Array.isArray(heroIntro) && heroIntro.length > 0;
  const FALLBACK_INTRO =
    "From first launches to established brands, these stories show how thoughtful packaging can solve real business challenges and create memorable customer experiences.";

  const collectionTitle = pageData?.metaTitle?.trim() || FALLBACK_TITLE;
  const collectionDescription =
    pageData?.metaDescription?.trim() || FALLBACK_DESCRIPTION;
  const { org } = pakfactoryOrganization();

  const jsonLd = serializeJsonLd(
    jsonLdGraph([
      org,
      breadcrumbList([
        { name: "Home", url: absoluteUrl("/") },
        { name: "Case Studies", url: PAGE_URL },
      ]),
      collectionPage({
        name: collectionTitle,
        url: PAGE_URL,
        description: collectionDescription,
      }),
      itemList({
        name: "Case Studies",
        items: studies.map((s) => ({
          name: s.title,
          url: absoluteUrl(`${CASE_STUDIES_BASE_PATH}/${s.slug}`),
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
                block: {
                  normal: ({ children }) => (
                    <p className="text-xl leading-7 text-muted-foreground">
                      {children}
                    </p>
                  ),
                },
                marks: {
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  link: ({ value, children }) => (
                    <a
                      href={value?.href}
                      className="underline underline-offset-4 hover:no-underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                },
              }}
            />
          </div>
        ) : (
          <p className="max-w-[1141px] text-xl leading-7 text-muted-foreground">
            {FALLBACK_INTRO}
          </p>
        )}
      </PageDielineSection>

      {studies.length === 0 ? (
        <PageDielineSection innerClassName="py-12">
          <p className="text-sm text-muted-foreground">Case studies coming soon.</p>
        </PageDielineSection>
      ) : (
        <CaseStudyListingGrid studies={studies} initialPage={initialPage} />
      )}
    </>
  );
}
