import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { Breadcrumb } from "@pakfactory/components/layout/breadcrumb";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";
import { getPublishedSanityClient, getSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  CASE_STUDIES_PAGE_QUERY,
  CASE_STUDY_BY_SLUG_QUERY,
  CASE_STUDY_PATHS_QUERY,
  type CaseStudiesPageData,
  type CaseStudyCard,
  type CaseStudyDetail,
  type CaseStudyPath,
} from "@pakfactory/sanity/queries";
import { absoluteUrl } from "@/lib/site";
import { plainTextFromBlocks } from "@/lib/portable-text";
import { buildCaseStudyJsonLd } from "@/lib/case-study-jsonld";
import { CaseStudyShare } from "./_components/case-study-share";
import { CaseStudyHeroMedia } from "./_components/case-study-hero-media";
import { CaseStudyMetaCard } from "./_components/case-study-meta-card";
import { RelatedStudiesCarousel } from "./_components/related-studies-carousel";
import {
  caseStudyPtComponents,
  makeHeroIntroPtComponents,
} from "./_components/pt-components";

export const revalidate = 300;

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

  const title =
    study.metaTitle?.trim() ||
    (study.client?.name
      ? `${study.client.name} Packaging Case Study`
      : study.title);
  const description =
    study.metaDescription?.trim() ||
    study.cardSummary ||
    plainTextFromBlocks(study.heroIntro as PortableTextBlock[] | undefined) ||
    undefined;
  const canonical = study.canonicalUrl || absoluteUrl(`/case-studies/${slug}`);
  const globalNoIndex = process.env.WWW_DISABLE_INDEXING === "true";
  const robots = [
    globalNoIndex || study.allowIndex === false ? "noindex" : "index",
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

function DashedDivider() {
  return (
    <div
      aria-hidden="true"
      className="h-px w-full"
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--border) 0 6px, transparent 6px 12px)",
        backgroundSize: "12px 1px",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;

  const client = isSanityConfigured() ? await getSanityClient() : null;

  const [study, pageData] = await Promise.all([
    client
      ? client
          .fetch<CaseStudyDetail | null>(CASE_STUDY_BY_SLUG_QUERY, { slug })
          .catch(() => null)
      : Promise.resolve(null),
    client
      ? client
          .fetch<CaseStudiesPageData | null>(CASE_STUDIES_PAGE_QUERY)
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!study) notFound();

  const pageUrl = absoluteUrl(`/case-studies/${slug}`);
  const jsonLd = buildCaseStudyJsonLd(study);

  const heroIntroPtComponents = makeHeroIntroPtComponents(study.client?.website);
  const contactHref = absoluteUrl("/contact");
  const wwwHomeHref = absoluteUrl("/");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* Breadcrumb */}
      <PageDielineSection innerClassName="border-b border-dashed border-border py-4">
        <Breadcrumb
          items={[
            { label: "Home", href: wwwHomeHref },
            { label: "Case Studies", href: "/case-studies" },
            { label: study.title },
          ]}
        />
      </PageDielineSection>

      {/* Hero — title + intro left, meta card right */}
      <PageDielineSection
        className="border-b border-dashed border-border"
        innerClassName="flex flex-col items-start gap-12 py-24 lg:flex-row lg:gap-[98px]"
      >
        {/* Left column */}
        <div className="flex flex-1 flex-col gap-[42px]">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[48px]">
              {study.title}
            </h1>
            {Array.isArray(study.heroIntro) && study.heroIntro.length > 0 && (
              <div className="max-w-2xl text-lg leading-7 text-foreground">
                <PortableText
                  value={study.heroIntro as PortableTextBlock[]}
                  components={heroIntroPtComponents}
                />
              </div>
            )}
          </div>
          {study.heroMedia && (
            <CaseStudyHeroMedia heroMedia={study.heroMedia} title={study.title} />
          )}
        </div>

        {/* Right column — meta card with client + taxonomy */}
        <CaseStudyMetaCard
          client={study.client}
          products={study.products}
          expertiseAreas={study.expertiseAreas}
          customizations={study.customizations}
        />
      </PageDielineSection>

      {/* Body — left sidebar + right content */}
      <PageDielineSection innerClassName="grid grid-cols-1 gap-0 px-0 lg:grid-cols-[300px_1fr]">

        {/* ── Left sidebar ── */}
        <aside className="flex flex-col gap-[42px] border-r border-dashed border-border px-4 pb-16 pt-24 md:px-8 lg:px-12">
          {/* Metrics */}
          {study.highlights && study.highlights.length > 0 && (
            <div className="flex w-full flex-col gap-[42px]">
              <p className="text-lg leading-7 capitalize text-muted-foreground">Metrics</p>
              {study.highlights.map((h) => (
                <div key={h._key} className="flex w-full flex-col gap-3">
                  <p className="text-lg font-semibold leading-7 text-foreground">
                    {h.title}
                  </p>
                  {h.description && (
                    <p className="text-sm leading-5 text-muted-foreground">
                      {h.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Share + CTA — sticky desktop sidebar */}
          <div className="sticky top-8 hidden flex-col gap-[42px] lg:flex">
            <div className="h-px w-[207px] border-t border-dashed border-border" />
            <CaseStudyShare
              url={pageUrl}
              title={study.title}
              showCta
              ctaHeading={pageData?.detailCta?.heading}
              primaryLabel={pageData?.detailCta?.primaryLabel}
              primaryHref={pageData?.detailCta?.primaryHref ?? contactHref}
              secondaryLabel={pageData?.detailCta?.secondaryLabel}
              secondaryHref={pageData?.detailCta?.secondaryHref ?? wwwHomeHref}
            />
          </div>
        </aside>

        {/* ── Right content ── */}
        <div className="flex flex-col gap-24 px-6 pb-24 pt-24 lg:px-32">

          {/* Challenges */}
          {Array.isArray(study.challenge) && study.challenge.length > 0 && (
            <section className="flex flex-col gap-12">
              <h2 className="text-4xl font-semibold leading-10 tracking-tight text-foreground">
                Challenges
              </h2>
              <DashedDivider />
              <div>
                <PortableText
                  value={study.challenge as PortableTextBlock[]}
                  components={caseStudyPtComponents}
                />
              </div>
            </section>
          )}

          {/* Solutions */}
          {Array.isArray(study.solution) && study.solution.length > 0 && (
            <section className="flex flex-col gap-12">
              <h2 className="text-4xl font-semibold leading-10 tracking-tight text-foreground">
                Solutions
              </h2>
              <DashedDivider />
              <div>
                <PortableText
                  value={study.solution as PortableTextBlock[]}
                  components={caseStudyPtComponents}
                />
              </div>
            </section>
          )}

          {/* Result */}
          {Array.isArray(study.result) && study.result.length > 0 && (
            <section className="flex flex-col gap-12">
              <h2 className="text-4xl font-semibold leading-10 tracking-tight text-foreground">
                Result
              </h2>
              <DashedDivider />
              <div>
                <PortableText
                  value={study.result as PortableTextBlock[]}
                  components={caseStudyPtComponents}
                />
              </div>
            </section>
          )}

          {/* Share + CTA — mobile only (lg+ gets the sidebar version) */}
          <CaseStudyShare
            url={pageUrl}
            title={study.title}
            showCta
            className="lg:hidden"
            ctaHeading={pageData?.detailCta?.heading}
            primaryLabel={pageData?.detailCta?.primaryLabel}
            primaryHref={pageData?.detailCta?.primaryHref ?? contactHref}
            secondaryLabel={pageData?.detailCta?.secondaryLabel}
            secondaryHref={pageData?.detailCta?.secondaryHref ?? wwwHomeHref}
          />
        </div>
      </PageDielineSection>

      {/* See What’s More — related studies */}
      {study.relatedStudies && study.relatedStudies.length > 0 && (
        <PageDielineSection
          className="border-t border-dashed border-border"
          innerClassName="px-0"
        >
          <RelatedStudiesCarousel
            studies={study.relatedStudies}
            heading={pageData?.relatedSectionHeading?.trim() || "See What’s More"}
            intro={
              pageData?.relatedSectionIntro?.trim() ||
              "Stay informed with the latest case studies and advancements from our team."
            }
          />
        </PageDielineSection>
      )}
    </>
  );
}
