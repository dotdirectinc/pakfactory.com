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

function stripWwwOrigin(href: string): ResolvedWwwHref {
  const origin = getWwwUrl().replace(/\/+$/, '');
  if (href.startsWith(origin)) {
    const path = href.slice(origin.length) || '/';
    return {
      href: path.startsWith('/') ? path : `/${path}`,
      external: false,
    };
  }
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
 * and in-section card links. Same-origin absolute www URLs become
 * root-relative for Next Link. Site path stays root-relative so the
 * browser uses the current host.
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
    return stripWwwOrigin(url);
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
