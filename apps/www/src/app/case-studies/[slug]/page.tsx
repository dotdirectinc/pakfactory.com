import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { ChevronRight } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDY_BY_SLUG_QUERY,
  CASE_STUDY_PATHS_QUERY,
  type CaseStudyDetail,
  type CaseStudyPath,
} from "@pakfactory/sanity/queries";
import { breadcrumbList, jsonLdGraph, serializeJsonLd, webPage } from "@pakfactory/seo";
import { absoluteUrl } from "@/lib/site";
import { CaseStudyCard as CaseStudyCardUI } from "@/components/modules/case-study-card";
import { CaseStudyShare } from "./_components/case-study-share";
import { CaseStudyHeroMedia } from "./_components/case-study-hero-media";
import {
  caseStudyPtComponents,
  makeHeroIntroPtComponents,
} from "./_components/pt-components";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (!isSanityConfigured()) return [];
  return getPublishedSanityClient()
    .fetch<CaseStudyPath[]>(CASE_STUDY_PATHS_QUERY)
    .catch(() => [] as CaseStudyPath[]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const study = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudyDetail | null>(CASE_STUDY_BY_SLUG_QUERY, { slug })
        .catch(() => null)
    : null;
  if (!study) return {};

  const title = study.metaTitle?.trim() || study.title;
  const description =
    study.metaDescription?.trim() || study.cardSummary || undefined;
  const canonical = study.canonicalUrl || absoluteUrl(`/case-studies/${slug}`);
  const robots = [
    study.allowIndex === false ? "noindex" : "index",
    study.allowFollow === false ? "nofollow" : "follow",
    study.noImageIndex ? "noimageindex" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    title: `${title} | PakFactory`,
    description,
    robots,
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

  const study = isSanityConfigured()
    ? await getPublishedSanityClient()
        .fetch<CaseStudyDetail | null>(CASE_STUDY_BY_SLUG_QUERY, { slug })
        .catch(() => null)
    : null;

  if (!study) notFound();

  const pageUrl = absoluteUrl(`/case-studies/${slug}`);
  const allTaxonomy = [
    ...(study.solutions ?? []),
    ...(study.products ?? []),
    ...(study.expertiseAreas ?? []),
    ...(study.capabilities ?? []),
  ];

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
        description: study.cardSummary ?? undefined,
      }),
    ]),
  );

  const heroIntroPtComponents = makeHeroIntroPtComponents(study.client?.website);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* Breadcrumb */}
      <PageDielineSection innerClassName="border-b border-dashed border-border py-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <Link href="/case-studies" className="hover:text-foreground">
                Case Studies
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li className="truncate text-foreground" aria-current="page">
              {study.title}
            </li>
          </ol>
        </nav>
      </PageDielineSection>

      {/* Hero media */}
      {study.heroMedia && (
        <PageDielineSection innerClassName="pt-10 pb-0">
          <CaseStudyHeroMedia heroMedia={study.heroMedia} title={study.title} />
        </PageDielineSection>
      )}

      {/* Main 2-col layout */}
      <PageDielineSection innerClassName="py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">

          {/* ── Left: primary content ── */}
          <div className="min-w-0">
            {/* Client + title */}
            {study.client?.name && (
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                {study.client.name}
              </p>
            )}
            <h1 className="text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
              {study.title}
            </h1>

            {/* Hero intro */}
            {Array.isArray(study.heroIntro) && study.heroIntro.length > 0 && (
              <div className="mt-4">
                <PortableText
                  value={study.heroIntro as PortableTextBlock[]}
                  components={heroIntroPtComponents}
                />
              </div>
            )}

            {/* Challenge */}
            {Array.isArray(study.challenge) && study.challenge.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
                  The Challenge
                </h2>
                <PortableText
                  value={study.challenge as PortableTextBlock[]}
                  components={caseStudyPtComponents}
                />
              </section>
            )}

            {/* Solution */}
            {Array.isArray(study.solution) && study.solution.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
                  Our Solution
                </h2>
                <PortableText
                  value={study.solution as PortableTextBlock[]}
                  components={caseStudyPtComponents}
                />
              </section>
            )}

            {/* Result */}
            {Array.isArray(study.result) && study.result.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
                  The Result
                </h2>
                <PortableText
                  value={study.result as PortableTextBlock[]}
                  components={caseStudyPtComponents}
                />
              </section>
            )}
          </div>

          {/* ── Right: sticky sidebar ── */}
          <aside className="flex flex-col gap-8 self-start lg:sticky lg:top-24">

            {/* Client card */}
            {study.client && (
              <div className="rounded-2xl border border-dashed border-border p-6">
                {study.client.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={study.client.logoUrl}
                    alt={study.client.name ?? "Client logo"}
                    className="mb-4 h-10 w-auto object-contain"
                  />
                )}
                {study.client.name && (
                  <p className="text-lg font-semibold text-foreground">
                    {study.client.name}
                  </p>
                )}
                {study.client.website && (
                  <a
                    href={study.client.website}
                    className="mt-1 block text-xs text-muted-foreground hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit website →
                  </a>
                )}
              </div>
            )}

            {/* Highlights (metrics rail) */}
            {study.highlights && study.highlights.length > 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Results
                </p>
                <dl className="flex flex-col gap-5">
                  {study.highlights.map((h) => (
                    <div key={h._key}>
                      <dt className="text-3xl font-bold tracking-tight text-foreground">
                        {h.title}
                      </dt>
                      {h.description && (
                        <dd className="mt-0.5 text-sm text-muted-foreground">
                          {h.description}
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Taxonomy chips */}
            {allTaxonomy.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTaxonomy.map((t) => (
                  <Badge
                    key={t._id}
                    variant="secondary"
                    className="rounded-full px-3 py-1 text-xs font-normal"
                  >
                    {t.title}
                  </Badge>
                ))}
              </div>
            )}

            {/* Share */}
            <CaseStudyShare url={pageUrl} title={study.title} />
          </aside>
        </div>
      </PageDielineSection>

      {/* Related case studies */}
      {study.relatedStudies && study.relatedStudies.length > 0 && (
        <PageDielineSection innerClassName="border-t border-dashed border-border py-16">
          <h2 className="mb-10 text-2xl font-semibold tracking-tight text-foreground">
            See What&apos;s More
          </h2>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {study.relatedStudies.map((s) => (
              <li key={s._id}>
                <CaseStudyCardUI
                  href={`/case-studies/${s.slug}`}
                  title={s.title}
                  clientName={s.client?.name}
                  cardSummary={s.cardSummary}
                  cardImageUrl={s.cardImageUrl}
                  cardImageAlt={s.cardImageAlt}
                  solutions={s.solutions}
                  products={s.products}
                  isVideo={s.heroMediaType === "video"}
                />
              </li>
            ))}
          </ul>
        </PageDielineSection>
      )}
    </>
  );
}
