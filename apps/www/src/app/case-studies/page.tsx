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
import { CaseStudyCard } from "@/components/modules/case-study-card";

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

      <PageDielineSection innerClassName="border-b border-dashed border-border py-16">
        <h1 className="text-5xl font-bold tracking-tight">Case Studies</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Real packaging challenges. Real results.
        </p>
      </PageDielineSection>

      <PageDielineSection innerClassName="py-16">
        {studies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Case studies coming soon.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study, i) => (
              <li key={study._id}>
                <CaseStudyCard
                  href={`/case-studies/${study.slug}`}
                  title={study.title}
                  clientName={study.clientName}
                  excerpt={study.excerpt}
                  heroImageUrl={study.heroImageUrl}
                  heroImageAlt={study.heroImageAlt}
                  solutions={study.solutions}
                  packagingTypes={study.packagingTypes}
                  priority={i < 3}
                />
              </li>
            ))}
          </ul>
        )}
      </PageDielineSection>
    </>
  );
}
