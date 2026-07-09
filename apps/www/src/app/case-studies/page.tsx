import type { Metadata } from "next";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDIES_LISTING_QUERY,
  type CaseStudyCard,
} from "@pakfactory/sanity/queries";
import {
  breadcrumbList,
  collectionPage,
  itemList,
  jsonLdGraph,
  serializeJsonLd,
} from "@pakfactory/seo";
import { absoluteUrl } from "@/lib/site";
import { CaseStudyCard as CaseStudyCardUI } from "@/components/modules/case-study-card";
import { MOCK_CASE_STUDY_CARDS } from "@/lib/mock/case-studies";

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
  const sanityStudies = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudyCard[]>(CASE_STUDIES_LISTING_QUERY)
        .catch(() => [] as CaseStudyCard[])
    : ([] as CaseStudyCard[]);

  // Fall back to mock data until PROD-1650 schema + documents exist in Sanity.
  const studies = sanityStudies.length > 0 ? sanityStudies : MOCK_CASE_STUDY_CARDS;

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
      <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight">Case Studies</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Real packaging challenges. Real results.
        </p>

        {studies.length === 0 ? (
          <p className="mt-12 text-sm text-muted-foreground">
            Case studies coming soon.
          </p>
        ) : (
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => (
              <li key={study._id}>
                <CaseStudyCardUI
                  href={`/case-studies/${study.slug}`}
                  title={study.title}
                  clientName={study.clientName}
                  excerpt={study.excerpt}
                  heroImageUrl={study.heroImageUrl}
                  heroImageAlt={study.heroImageAlt}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
