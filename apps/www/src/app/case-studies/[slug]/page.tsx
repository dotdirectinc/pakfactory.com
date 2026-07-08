import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDY_BY_SLUG_QUERY,
  CASE_STUDY_PATHS_QUERY,
  type CaseStudyDetail,
  type CaseStudyPath,
} from "@pakfactory/sanity/queries";
import { breadcrumbList, jsonLdGraph, serializeJsonLd, webPage } from "@pakfactory/seo";
import { CaseStudyResult } from "@/components/ui/case-study-result";
import { absoluteUrl } from "@/lib/site";
import {
  MOCK_CASE_STUDY_DETAILS,
  MOCK_SLUGS,
} from "@/lib/mock/case-studies";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const sanityPaths = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudyPath[]>(CASE_STUDY_PATHS_QUERY)
        .catch(() => [] as CaseStudyPath[])
    : [];

  const sanitySlugSet = new Set(sanityPaths.map((p) => p.slug));
  // Include mock slugs only when Sanity has no documents yet.
  const mockPaths = sanityPaths.length === 0
    ? MOCK_SLUGS.map((slug) => ({ slug }))
    : [];

  return [...sanityPaths, ...mockPaths.filter((p) => !sanitySlugSet.has(p.slug))];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isSanityConfigured()) return {};

  const study = await getPublishedSanityClient()
    .fetch<CaseStudyDetail | null>(CASE_STUDY_BY_SLUG_QUERY, { slug })
    .catch(() => null);

  if (!study) return {};

  const title = study.metaTitle?.trim() || study.title;
  const description = study.metaDescription?.trim() || study.excerpt || undefined;
  const canonical = absoluteUrl(`/case-studies/${slug}`);

  return {
    title: `${title} | PakFactory`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(study.ogImageUrl ? { images: [{ url: study.ogImageUrl }] } : {}),
    },
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;

  const sanityStudy = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudyDetail | null>(CASE_STUDY_BY_SLUG_QUERY, { slug })
        .catch(() => null)
    : null;

  // Fall back to mock data until PROD-1650 schema + documents exist in Sanity.
  const study = sanityStudy ?? MOCK_CASE_STUDY_DETAILS[slug] ?? null;

  if (!study) notFound();

  const pageUrl = absoluteUrl(`/case-studies/${slug}`);

  const jsonLd = serializeJsonLd(
    jsonLdGraph([
      breadcrumbList([
        { name: "Home", url: absoluteUrl("/") },
        { name: "Case Studies", url: absoluteUrl("/case-studies") },
        { name: study.title, url: pageUrl },
      ]),
      webPage({
        url: pageUrl,
        name: study.title,
        description: study.excerpt ?? undefined,
      }),
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Hero */}
        {study.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={study.heroImageUrl}
            alt={study.heroImageAlt ?? study.title}
            className="mb-10 aspect-video w-full rounded-xl object-cover"
          />
        )}

        {/* Meta */}
        <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {study.industry && (
            <span className="font-medium uppercase tracking-wider">
              {study.industry}
            </span>
          )}
          {study.clientName && <span>{study.clientName}</span>}
        </div>

        <h1 className="text-4xl font-bold tracking-tight">{study.title}</h1>

        {study.excerpt && (
          <p className="mt-4 text-lg text-muted-foreground">{study.excerpt}</p>
        )}

        {/* Results */}
        {study.results && study.results.length > 0 && (
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {study.results.map((r) => (
              <li key={r._key}>
                <CaseStudyResult
                  value={r.value}
                  metric={r.metric}
                  description={r.description}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Body */}
        {Array.isArray(study.body) && study.body.length > 0 && (
          <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
            <PortableText value={study.body as PortableTextBlock[]} />
          </div>
        )}
      </main>
    </>
  );
}
