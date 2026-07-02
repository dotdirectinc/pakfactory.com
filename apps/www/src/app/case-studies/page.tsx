import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import {
  CASE_STUDIES_LISTING_QUERY,
  type CaseStudyCard,
} from "@pakfactory/sanity/queries";
import {
  itemList,
  jsonLdGraph,
  serializeJsonLd,
  webPage,
} from "@pakfactory/seo";
import { absoluteUrl } from "@/lib/site";

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
        .fetch<CaseStudyCard[]>(CASE_STUDIES_LISTING_QUERY)
        .catch(() => [] as CaseStudyCard[])
    : ([] as CaseStudyCard[]);

  const jsonLd = serializeJsonLd(
    jsonLdGraph([
      webPage({ url: PAGE_URL, name: "Case Studies | PakFactory" }),
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
                <Link
                  href={`/case-studies/${study.slug}`}
                  className="group block rounded-lg border p-6 transition-shadow hover:shadow-md"
                >
                  {study.heroImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={study.heroImageUrl}
                      alt={study.heroImageAlt ?? study.title}
                      className="mb-4 aspect-video w-full rounded object-cover"
                    />
                  )}
                  {study.industry && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {study.industry}
                    </p>
                  )}
                  <h2 className="text-lg font-semibold group-hover:underline">
                    {study.title}
                  </h2>
                  {study.clientName && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {study.clientName}
                    </p>
                  )}
                  {study.excerpt && (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                      {study.excerpt}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
