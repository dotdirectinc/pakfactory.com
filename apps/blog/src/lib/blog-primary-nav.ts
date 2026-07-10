import {
  resolveSanityDocumentHref,
  type SanityLinkDocument,
} from "@pakfactory/sanity/resolve-document-href";
import { sanityImageAlt, sanityImageUrl } from "@/lib/sanity-image";
import { getWwwUrl } from "@/lib/site";

export const DEFAULT_HEADER_CTA_LABEL = "Contact Us";
export const DEFAULT_HEADER_CTA_HREF = "/contribute";

export type BlogPrimaryNavLogo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type BlogPrimaryNavCta = {
  label: string;
  href: string;
  external: boolean;
};

export type BlogPrimaryNavHeader = {
  logo?: BlogPrimaryNavLogo;
  cta: BlogPrimaryNavCta;
};

type PrimaryNavLogoRow = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
} | null;

type PrimaryNavCtaRow = {
  label?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  internalLink?: SanityLinkDocument | null;
} | null;

export type BlogPrimaryNavHeaderRow = {
  logo?: PrimaryNavLogoRow;
  cta?: PrimaryNavCtaRow;
} | null;

export function getDefaultPrimaryNavHeader(): BlogPrimaryNavHeader {
  return {
    cta: {
      label: DEFAULT_HEADER_CTA_LABEL,
      href: DEFAULT_HEADER_CTA_HREF,
      external: false,
    },
  };
}

function resolvePrimaryNavLogo(
  logo: PrimaryNavLogoRow | undefined,
): BlogPrimaryNavLogo | undefined {
  if (!logo) return undefined;
  const src = sanityImageUrl(logo);
  if (!src) return undefined;
  const alt = sanityImageAlt(logo) ?? "PakFactory Blog";
  return {
    src,
    alt,
    width: typeof logo.width === "number" ? logo.width : undefined,
    height: typeof logo.height === "number" ? logo.height : undefined,
  };
}

function resolvePrimaryNavCta(
  cta: PrimaryNavCtaRow | undefined,
): BlogPrimaryNavCta {
  const fallback = getDefaultPrimaryNavHeader().cta;
  const label = cta?.label?.trim() || fallback.label;

  if (cta?.linkType === "external") {
    const href = cta.externalUrl?.trim();
    if (href) {
      return { label, href, external: true };
    }
  }

  if (cta?.linkType === "internal" && cta.internalLink) {
    const resolved = resolveSanityDocumentHref(cta.internalLink, {
      surface: "blog",
      wwwOrigin: getWwwUrl(),
    });
    if (resolved) {
      return {
        label,
        href: resolved.href,
        external: resolved.external,
      };
    }
  }

  return { label, href: fallback.href, external: fallback.external };
}

export function resolvePrimaryNavHeader(
  header: BlogPrimaryNavHeaderRow | undefined,
): BlogPrimaryNavHeader {
  return {
    logo: resolvePrimaryNavLogo(header?.logo ?? undefined),
    cta: resolvePrimaryNavCta(header?.cta ?? undefined),
  };
}
