import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import {
  resolveFormatString,
  type FormatTokens,
} from "@/lib/resolve-format-string";
import {
  robotsDirectiveToMetadata,
  type BlogRobotsDirective,
  type DocSeoOverrides,
} from "@/lib/seo";

/** Raw SEO/Social fields from Sanity (shared field names across content types). */
export type DocSeoFields = DocSeoOverrides & {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  canonical?: string | null;
};

export type BuildDocMetadataInput = {
  /** Display name fallback (post title, category name, author name, …). */
  title: string;
  /** metaDescription fallback (excerpt, plain description, shortBio, …). */
  descriptionFallback?: string | null;
  /** Featured/hero image URL for OG when ogImage is blank. */
  featuredImageUrl?: string | null;
  /** Path for self-canonical when `canonical` is blank (e.g. `/slug`, `/tag/foo`). */
  selfCanonicalPath: string;
  /** Global default OG from settings singleton. */
  defaultOgImageUrl?: string | null;
  seo: DocSeoFields;
  /** Listing/post robots baseline before per-doc overrides. */
  robots?: BlogRobotsDirective;
  openGraphType?: "website" | "article" | "profile";
  titleSuffix?: string;
  /** Full document title when paginated or other overrides are needed. */
  titleOverride?: string | null;
  descriptionOverride?: string | null;
  /** Blog Settings format strings — applied when doc meta fields are blank. */
  metaTitleFormat?: string | null;
  metaDescriptionFormat?: string | null;
  formatTokens?: FormatTokens;
};

const DEFAULT_TITLE_SUFFIX = " | PakFactory Blog";

/** Resolve canonical: blank → self; relative path → absoluteUrl; full URL passthrough. */
export function resolveCanonicalUrl(
  canonical: string | null | undefined,
  selfCanonicalPath: string,
): string {
  const trimmed = canonical?.trim();
  if (!trimmed) return absoluteUrl(selfCanonicalPath);
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return absoluteUrl(path);
}

/** Layer per-doc `allowIndex` / `allowFollow` / `noImageIndex` on a baseline directive. */
export function resolveDocRobots(
  seo: DocSeoFields,
  base: BlogRobotsDirective = { index: true, follow: true },
): BlogRobotsDirective {
  return {
    index: base.index && seo.allowIndex !== false,
    follow: base.follow && seo.allowFollow !== false,
    ...(base.noImageIndex || seo.noImageIndex
      ? { noImageIndex: true }
      : {}),
  };
}

/**
 * Build Next.js metadata from the shared SEO/Social field contract.
 * Fallback chains: metaTitle→title, metaDescription→descriptionFallback,
 * ogTitle→metaTitle→title, ogDescription→metaDescription→descriptionFallback,
 * ogImage→featuredImage→defaultOgImage.
 */
export function buildDocMetadata(input: BuildDocMetadataInput): Metadata {
  const suffix = input.titleSuffix ?? DEFAULT_TITLE_SUFFIX;
  const { seo } = input;
  const tokens = input.formatTokens ?? {};

  const metaTitleFromFormat =
    !seo.metaTitle?.trim() && input.metaTitleFormat?.trim()
      ? resolveFormatString(input.metaTitleFormat, tokens)
      : "";
  const metaDescriptionFromFormat =
    !seo.metaDescription?.trim() && input.metaDescriptionFormat?.trim()
      ? resolveFormatString(input.metaDescriptionFormat, tokens)
      : "";

  const title =
    input.titleOverride?.trim() ||
    seo.metaTitle?.trim() ||
    metaTitleFromFormat ||
    `${input.title}${suffix}`;
  const description =
    input.descriptionOverride?.trim() ||
    seo.metaDescription?.trim() ||
    metaDescriptionFromFormat?.slice(0, 160) ||
    input.descriptionFallback?.trim()?.slice(0, 160) ||
    undefined;

  const ogTitle =
    seo.ogTitle?.trim() || seo.metaTitle?.trim() || input.title;
  const ogDescription =
    seo.ogDescription?.trim() ||
    seo.metaDescription?.trim() ||
    input.descriptionFallback?.trim() ||
    undefined;

  const ogImageUrl =
    seo.ogImageUrl ||
    input.featuredImageUrl ||
    input.defaultOgImageUrl ||
    undefined;

  const canonical = resolveCanonicalUrl(seo.canonical, input.selfCanonicalPath);
  const robots = robotsDirectiveToMetadata(
    resolveDocRobots(seo, input.robots),
  );

  return {
    title,
    ...(description ? { description } : {}),
    robots,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      ...(ogDescription ? { description: ogDescription } : {}),
      url: canonical,
      type: input.openGraphType ?? "website",
      ...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: ogTitle,
      ...(ogDescription ? { description: ogDescription } : {}),
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}
