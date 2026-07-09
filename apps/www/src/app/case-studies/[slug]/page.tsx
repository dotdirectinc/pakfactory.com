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
  CASE_STUDY_RELATED_QUERY,
  type CaseStudyCard,
  type CaseStudyDetail,
  type CaseStudyPath,
} from "@pakfactory/sanity/queries";
import { breadcrumbList, jsonLdGraph, serializeJsonLd, webPage } from "@pakfactory/seo";
import { absoluteUrl } from "@/lib/site";
import { CaseStudyCard as CaseStudyCardUI } from "@/components/modules/case-study-card";
import { CaseStudyShare } from "./_components/case-study-share";
import { caseStudyPtComponents } from "./_components/pt-components";

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

  const client = isSanityConfigured() ? getPublishedSanityClient() : null;

  const [study, relatedStudies] = await Promise.all([
    client
      ? client
          .fetch<CaseStudyDetail | null>(CASE_STUDY_BY_SLUG_QUERY, { slug })
          .catch(() => null)
      : Promise.resolve(null),
    client
      ? client
          .fetch<CaseStudyCard[]>(CASE_STUDY_RELATED_QUERY, { currentSlug: slug })
          .catch(() => [] as CaseStudyCard[])
      : Promise.resolve([] as CaseStudyCard[]),
  ]);

  if (!study) notFound();

  const pageUrl = absoluteUrl(`/case-studies/${slug}`);
  const allTaxonomy = [
    ...(study.solutions ?? []),
    ...(study.packagingTypes ?? []),
    ...(study.expertise ?? []),
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

      {/* Hero image */}
      {study.heroImageUrl && (
        <PageDielineSection innerClassName="pt-10 pb-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary">
            <Image
              src={study.heroImageUrl}
              alt={study.heroImageAlt ?? study.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1280px"
              priority
            />
          </div>
        </PageDielineSection>
      )}

      {/* Main 2-col layout */}
      <PageDielineSection innerClassName="py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">

          {/* ── Left: primary content ── */}
          <div className="min-w-0">
            {/* Client + title */}
            {study.clientName && (
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                {study.clientName}
              </p>
            )}
            <h1 className="text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
              {study.title}
            </h1>
            {study.excerpt && (
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                {study.excerpt}
              </p>
            )}

            {/* Challenges */}
            {study.challenges && (
              <section className="mt-12">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  The Challenge
                </h2>
                {study.challenges.intro && (
                  <p className="mt-3 text-base leading-7 text-foreground">
                    {study.challenges.intro}
                  </p>
                )}
                {study.challenges.items && study.challenges.items.length > 0 && (
                  <ul className="mt-4 ml-6 list-disc space-y-2 text-base text-foreground">
                    {study.challenges.items.map((item, i) => (
                      <li key={i} className="leading-7">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Solutions body */}
            {Array.isArray(study.solutionsBody) && study.solutionsBody.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
                  Our Solution
                </h2>
                <PortableText
                  value={study.solutionsBody as PortableTextBlock[]}
                  components={caseStudyPtComponents}
                />
              </section>
            )}

            {/* Result images */}
            {study.resultImages && study.resultImages.length > 0 && (
              <div className="mt-12 grid grid-cols-2 gap-3">
                {study.resultImages.map((img) => (
                  img.url && (
                    <figure key={img._key} className="relative aspect-video overflow-hidden rounded-xl">
                      <Image
                        src={img.url}
                        alt={img.alt ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 400px"
                      />
                      {img.caption && (
                        <figcaption className="absolute inset-x-0 bottom-0 bg-black/40 px-3 py-2 text-xs text-white">
                          {img.caption}
                        </figcaption>
                      )}
                    </figure>
                  )
                ))}
              </div>
            )}

            {/* Result body */}
            {Array.isArray(study.resultBody) && study.resultBody.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
                  The Result
                </h2>
                <PortableText
                  value={study.resultBody as PortableTextBlock[]}
                  components={caseStudyPtComponents}
                />
              </section>
            )}
          </div>

          {/* ── Right: sticky sidebar ── */}
          <aside className="flex flex-col gap-8 self-start lg:sticky lg:top-24">

            {/* Client card */}
            {(study.clientName || study.clientLogoUrl) && (
              <div className="rounded-2xl border border-dashed border-border p-6">
                {study.clientLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={study.clientLogoUrl}
                    alt={study.clientName ?? "Client logo"}
                    className="mb-4 h-10 w-auto object-contain"
                  />
                )}
                {study.clientName && (
                  <p className="text-lg font-semibold text-foreground">{study.clientName}</p>
                )}
              </div>
            )}

            {/* Metrics */}
            {study.metrics && study.metrics.length > 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Results
                </p>
                <dl className="flex flex-col gap-5">
                  {study.metrics.map((m) => (
                    <div key={m._key}>
                      <dt className="text-3xl font-bold tracking-tight text-foreground">
                        {m.title}
                      </dt>
                      {m.description && (
                        <dd className="mt-0.5 text-sm text-muted-foreground">
                          {m.description}
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Taxonomy */}
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
      {relatedStudies.length > 0 && (
        <PageDielineSection innerClassName="border-t border-dashed border-border py-16">
          <h2 className="mb-10 text-2xl font-semibold tracking-tight text-foreground">
            Related Case Studies
          </h2>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {relatedStudies.map((s) => (
              <li key={s._id}>
                <CaseStudyCardUI
                  href={`/case-studies/${s.slug}`}
                  title={s.title}
                  clientName={s.clientName}
                  excerpt={s.excerpt}
                  heroImageUrl={s.heroImageUrl}
                  heroImageAlt={s.heroImageAlt}
                  solutions={s.solutions}
                  packagingTypes={s.packagingTypes}
                />
              </li>
            ))}
          </ul>
        </PageDielineSection>
      )}
    </>
  );
}
