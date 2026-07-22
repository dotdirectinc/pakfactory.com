import {
  article,
  breadcrumbList,
  jsonLdGraph,
  organization,
  serializeJsonLd,
  videoObject,
  webPage,
} from "@pakfactory/seo";
import type { CaseStudyDetail } from "@pakfactory/sanity/queries";
import { absoluteUrl, getSiteUrl } from "@/lib/site";
import { resolveCaseStudyOgImageUrl } from "@/lib/case-study-metadata";

function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function taxonomyKeywords(study: CaseStudyDetail): string[] {
  const titles = [
    ...(study.products ?? []),
    ...(study.expertiseAreas ?? []),
    ...(study.customizations ?? []),
  ]
    .map((item) => item.title?.trim())
    .filter((title): title is string => Boolean(title));

  return [...new Set(titles)];
}

/** PakFactory publisher Organization node for www case-study graphs. */
export function pakfactoryOrganization(): {
  org: Record<string, unknown>;
  orgId: string;
} {
  const origin = getSiteUrl().replace(/\/+$/, "");
  const orgId = `${origin}#organization`;
  return {
    orgId,
    org: organization({
      name: "PakFactory",
      url: origin,
      id: orgId,
    }),
  };
}

/** Full @graph for a case study detail page. */
export function buildCaseStudyJsonLd(
  study: CaseStudyDetail,
  defaultOgImageUrl?: string | null,
): string {
  const pageUrl = absoluteUrl(`/case-studies/${study.slug}`);
  const { org, orgId } = pakfactoryOrganization();
  const image = resolveCaseStudyOgImageUrl(study, defaultOgImageUrl);
  const keywords = taxonomyKeywords(study);
  const articleSection = study.client?.industry?.title?.trim() || undefined;

  const nodes: Record<string, unknown>[] = [
    org,
    article({
      id: pageUrl,
      url: pageUrl,
      headline: study.title,
      description: study.cardSummary ?? undefined,
      datePublished: toIsoDate(study.publishedAt),
      dateModified: toIsoDate(study.dateModified ?? study.publishedAt),
      ...(image ? { image } : {}),
      publisher: { "@id": orgId },
      ...(articleSection ? { articleSection } : {}),
      ...(keywords.length > 0 ? { keywords } : {}),
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
    }),
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
  ];

  const isVideo = study.heroMedia?.mediaType === "video";
  const videoThumbnail =
    study.heroMedia?.videoThumbnailUrl ?? study.cardImageUrl;

  if (
    isVideo &&
    study.heroMedia?.videoUrl &&
    videoThumbnail &&
    study.publishedAt
  ) {
    nodes.push(
      videoObject({
        name: study.title,
        description: study.cardSummary ?? study.title,
        thumbnailUrl: videoThumbnail,
        uploadDate: study.publishedAt,
        contentUrl: study.heroMedia.videoUrl,
        id: `${pageUrl}#video`,
      }),
    );
  }

  return serializeJsonLd(jsonLdGraph(nodes));
}
