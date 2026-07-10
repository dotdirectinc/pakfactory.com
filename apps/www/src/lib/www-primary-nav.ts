import type {
  PrimaryNavHeader,
  PrimaryNavItem,
  PrimaryNavLogo,
} from "@pakfactory/components/layout/primary-nav-types";
import { DEFAULT_BLOG_LANGUAGE } from "@pakfactory/sanity/languages";
import {
  BLOG_GLOBAL_SETTINGS_QUERY,
  BLOG_NAV_CATEGORIES_QUERY,
} from "@pakfactory/sanity/queries";
import {
  resolveDocumentPath,
  resolveSanityDocumentHref,
  resolveSanityDocumentLabel,
  type SanityLinkDocument,
} from "@pakfactory/sanity/resolve-document-href";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { getWwwUrl } from "@/lib/site";
import { BLOG_NAV_FALLBACK, BLOG_URL } from "@/lib/www-nav";

export const DEFAULT_WWW_HEADER_CTA_LABEL = "Contact Us";

const BLOG_DOC_TYPES = new Set([
  "blogCategory",
  "blogPage",
  "post",
  "blogTag",
  "author",
]);

type CompanyLogoRow = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
} | null;

type WwwGlobalSettings = {
  companyLogo?: CompanyLogoRow;
} | null;

type BlogNavCategoryRef = {
  _id?: string;
  title?: string | null;
  navLabel?: string | null;
  slug?: string | null;
  language?: string | null;
};

type BlogNavLinkRow = {
  label?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  sitePath?: string | null;
  internalLink?: SanityLinkDocument | null;
};

type BlogNavItemRow = {
  _type?: string | null;
  _key?: string | null;
  category?: BlogNavCategoryRef | null;
} & BlogNavLinkRow;

type PrimaryNavCtaRow = {
  label?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  internalLink?: SanityLinkDocument | null;
} | null;

type BlogNavSettingsDoc = {
  _id?: string;
  categories?: (BlogNavItemRow | null)[] | null;
  header?: {
    cta?: PrimaryNavCtaRow;
  } | null;
} | null;

export type WwwPrimaryNavData = {
  navItems: PrimaryNavItem[];
  header: PrimaryNavHeader;
};

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function getDefaultWwwPrimaryNavHeader(wwwUrl: string): PrimaryNavHeader {
  return {
    cta: {
      label: DEFAULT_WWW_HEADER_CTA_LABEL,
      href: `${normalizeOrigin(wwwUrl)}/contact`,
      external: false,
    },
  };
}

export function resolveWwwCompanyLogo(
  global: WwwGlobalSettings | null | undefined,
): PrimaryNavLogo | undefined {
  const logo = global?.companyLogo;
  const src = logo?.url?.trim();
  if (!src) return undefined;
  return {
    src,
    alt: logo?.alt?.trim() || "PakFactory Blog",
    width: typeof logo?.width === "number" ? logo.width : undefined,
    height: typeof logo?.height === "number" ? logo.height : undefined,
  };
}

function resolveWwwCrossSurfaceHref(
  doc: SanityLinkDocument,
  { blogUrl, wwwUrl }: { blogUrl: string; wwwUrl: string },
): { href: string; external: boolean } | null {
  const path = resolveDocumentPath(doc);
  if (!path) return null;

  const isBlogDoc = BLOG_DOC_TYPES.has(doc._type ?? "");
  if (isBlogDoc) {
    return {
      href: `${normalizeOrigin(blogUrl)}${path}`,
      external: true,
    };
  }

  const resolved = resolveSanityDocumentHref(doc, {
    surface: "www",
    wwwOrigin: wwwUrl,
  });
  if (!resolved) return null;

  return {
    href: path,
    external: false,
  };
}

function resolveWwwNavLink(
  link: BlogNavLinkRow,
  origins: { blogUrl: string; wwwUrl: string },
): { href: string; external: boolean; label: string } | null {
  if (link.linkType === "external") {
    const href = link.externalUrl?.trim();
    if (!href) return null;
    const label = link.label?.trim() || href;
    return { href, external: true, label };
  }

  if (link.linkType === "path") {
    const sitePath = link.sitePath?.trim();
    if (!sitePath) return null;
    const href = `${normalizeOrigin(origins.blogUrl)}${sitePath}`;
    const label = link.label?.trim() || sitePath;
    return { href, external: true, label };
  }

  if (link.linkType === "internal" && link.internalLink) {
    const resolved = resolveWwwCrossSurfaceHref(link.internalLink, origins);
    if (!resolved) return null;
    const label =
      link.label?.trim() ||
      resolveSanityDocumentLabel(link.internalLink) ||
      resolved.href;
    return { ...resolved, label };
  }

  return null;
}

export function resolveWwwPrimaryNavItems(
  doc: BlogNavSettingsDoc,
  {
    blogUrl = BLOG_URL,
    wwwUrl = getWwwUrl(),
    language = DEFAULT_BLOG_LANGUAGE,
  }: {
    blogUrl?: string;
    wwwUrl?: string;
    language?: string;
  } = {},
): PrimaryNavItem[] {
  if (!doc?._id) return [];

  const items: PrimaryNavItem[] = [];
  const origins = { blogUrl, wwwUrl };

  for (const row of doc.categories ?? []) {
    if (!row) continue;

    const category = row.category;
    if (category?.slug?.trim() && category?.title?.trim()) {
      if ((category.language ?? language) !== language) continue;
      const slug = category.slug.trim();
      items.push({
        key: category._id ?? row._key ?? slug,
        label: category.navLabel?.trim() || category.title,
        href: `${normalizeOrigin(blogUrl)}/${slug}`,
        external: true,
        categorySlug: slug,
      });
      continue;
    }

    if (row.linkType) {
      const resolved = resolveWwwNavLink(row, origins);
      if (!resolved) continue;
      items.push({
        key: row._key ?? resolved.href,
        label: resolved.label,
        href: resolved.href,
        ...(resolved.external ? { external: true } : {}),
      });
    }
  }

  return items;
}

function resolveWwwPrimaryNavCta(
  cta: PrimaryNavCtaRow | undefined,
  origins: { blogUrl: string; wwwUrl: string },
): PrimaryNavHeader["cta"] {
  const fallback = getDefaultWwwPrimaryNavHeader(origins.wwwUrl).cta;
  const label = cta?.label?.trim() || fallback.label;

  if (cta?.linkType === "external") {
    const href = cta.externalUrl?.trim();
    if (href) {
      return { label, href, external: true };
    }
  }

  if (cta?.linkType === "internal" && cta.internalLink) {
    const resolved = resolveWwwCrossSurfaceHref(cta.internalLink, origins);
    if (resolved) {
      return {
        label,
        href: resolved.href,
        external: resolved.external,
      };
    }
  }

  return fallback;
}

export function resolveWwwPrimaryNav(
  doc: BlogNavSettingsDoc,
  global: WwwGlobalSettings | null | undefined,
  {
    blogUrl = BLOG_URL,
    wwwUrl = getWwwUrl(),
    language = DEFAULT_BLOG_LANGUAGE,
  }: {
    blogUrl?: string;
    wwwUrl?: string;
    language?: string;
  } = {},
): WwwPrimaryNavData {
  const origins = { blogUrl, wwwUrl };
  return {
    navItems: resolveWwwPrimaryNavItems(doc, { blogUrl, wwwUrl, language }),
    header: {
      cta: resolveWwwPrimaryNavCta(doc?.header?.cta ?? undefined, origins),
      logo: resolveWwwCompanyLogo(global),
    },
  };
}

export async function fetchWwwPrimaryNav(): Promise<WwwPrimaryNavData> {
  const wwwUrl = getWwwUrl();

  if (!isSanityConfigured()) {
    return {
      navItems: BLOG_NAV_FALLBACK,
      header: getDefaultWwwPrimaryNavHeader(wwwUrl),
    };
  }

  try {
    const client = getPublishedSanityClient();
    const [doc, global] = await Promise.all([
      client.fetch<BlogNavSettingsDoc>(BLOG_NAV_CATEGORIES_QUERY, {
        language: DEFAULT_BLOG_LANGUAGE,
      }),
      client.fetch<WwwGlobalSettings>(BLOG_GLOBAL_SETTINGS_QUERY),
    ]);

    return resolveWwwPrimaryNav(doc, global, { wwwUrl });
  } catch {
    return {
      navItems: BLOG_NAV_FALLBACK,
      header: getDefaultWwwPrimaryNavHeader(wwwUrl),
    };
  }
}
