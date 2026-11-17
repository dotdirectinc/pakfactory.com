import {
  resolveSanityDocumentHref,
  type SanityLinkDocument,
} from '@pakfactory/sanity/resolve-document-href';
import {getWwwUrl} from '@/lib/site';

export type ResolvedWwwHref = {
  href: string;
  external: boolean;
};

/** Studio link target shape used by www nav, footer, and section cards. */
export type WwwLinkHrefInput = {
  linkType?: string | null;
  externalUrl?: string | null;
  relativePath?: string | null;
  internalLink?: SanityLinkDocument | null;
};

/** @deprecated Prefer {@link WwwLinkHrefInput}. */
export type SectionLinkHrefInput = WwwLinkHrefInput;

/** Apex form so `www.pakfactory.com` and `pakfactory.com` match. */
function apexHost(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

function isPakfactoryWwwHost(hostname: string): boolean {
  return apexHost(hostname) === 'pakfactory.com';
}

/**
 * Marketing pages live on this www app. Absolute production URLs must become
 * root-relative so localhost / staging stay on the current host. Blog is a
 * separate surface — keep those absolute.
 */
function sameSiteMarketingPath(absoluteUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(absoluteUrl);
  } catch {
    return null;
  }
  if (!isPakfactoryWwwHost(url.hostname)) return null;
  const path = `${url.pathname}${url.search}${url.hash}` || '/';
  if (path === '/blog' || path.startsWith('/blog/')) return null;
  return path.startsWith('/') ? path : `/${path}`;
}

function stripWwwOrigin(href: string): ResolvedWwwHref {
  const configured = getWwwUrl().replace(/\/+$/, '');
  let configuredHost = '';
  try {
    configuredHost = apexHost(new URL(configured).hostname);
  } catch {
    configuredHost = '';
  }

  try {
    const url = new URL(href);
    if (
      configuredHost &&
      isPakfactoryWwwHost(url.hostname) &&
      apexHost(url.hostname) === configuredHost
    ) {
      const path = `${url.pathname}${url.search}${url.hash}` || '/';
      return {
        href: path.startsWith('/') ? path : `/${path}`,
        external: false,
      };
    }
  } catch {
    // fall through
  }

  if (href.startsWith(configured)) {
    const path = href.slice(configured.length) || '/';
    return {
      href: path.startsWith('/') ? path : `/${path}`,
      external: false,
    };
  }

  const marketing = sameSiteMarketingPath(href);
  if (marketing) return {href: marketing, external: false};

  return {href, external: href.startsWith('http')};
}

/** Normalize a Studio site path to root-relative (no domain). */
export function normalizeSitePath(
  raw: string | null | undefined,
): string | null {
  let path = raw?.trim() ?? '';
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      path = `${url.pathname}${url.search}${url.hash}` || '/';
    } catch {
      return null;
    }
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

/**
 * Resolve a Studio linkTarget (internal | path | external) for www chrome
 * and in-section card links.
 *
 * - Site path → root-relative (current host).
 * - External blog URLs (pakfactory.com/blog…) stay absolute.
 * - External marketing URLs on pakfactory.com / www.pakfactory.com become
 *   root-relative so local and staging do not jump to production.
 * - Other external URLs stay absolute.
 * - Internal CMS hrefs that resolve onto the www origin become root-relative.
 */
export function resolveWwwNavHref(
  raw: WwwLinkHrefInput | null | undefined,
): ResolvedWwwHref | null {
  if (!raw) return null;

  if (raw.linkType === 'path') {
    const path = normalizeSitePath(raw.relativePath);
    if (!path) return null;
    return {href: path, external: false};
  }

  if (raw.linkType === 'external') {
    const url = raw.externalUrl?.trim();
    if (!url) return null;
    const marketing = sameSiteMarketingPath(url);
    if (marketing) return {href: marketing, external: false};
    return {href: url, external: true};
  }

  if (raw.linkType === 'internal' && raw.internalLink) {
    const resolved = resolveSanityDocumentHref(raw.internalLink, {
      surface: 'www',
      wwwOrigin: getWwwUrl(),
    });
    if (!resolved?.href) return null;
    return stripWwwOrigin(resolved.href);
  }

  return null;
}

/**
 * Resolve a section chrome link (Internal | Site path | External).
 * Delegates to {@link resolveWwwNavHref}; callers may still append `query`.
 */
export function resolveSectionLinkHref(
  raw: WwwLinkHrefInput | null | undefined,
): ResolvedWwwHref | null {
  return resolveWwwNavHref(raw);
}
