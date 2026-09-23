import {
  resolveSanityDocumentHref,
  type SanityLinkDocument,
} from '@pakfactory/sanity/resolve-document-href';
import type {WebsiteNavLinkDoc} from '@pakfactory/sanity/queries';
import {getWwwUrl} from '@/lib/site';

export type ResolvedWwwHref = {
  href: string;
  external: boolean;
};

export type SectionLinkHrefInput = {
  linkType?: string | null;
  externalUrl?: string | null;
  relativePath?: string | null;
  internalLink?: SanityLinkDocument | null;
};

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
 * Resolve a Studio linkTarget (internal | external) for www chrome.
 * Same-origin absolute www URLs become root-relative for Next Link.
 */
export function resolveWwwNavHref(
  raw: Pick<
    WebsiteNavLinkDoc,
    'linkType' | 'externalUrl' | 'internalLink'
  > | null | undefined,
): ResolvedWwwHref | null {
  if (!raw) return null;

  if (raw.linkType === 'external') {
    const url = raw.externalUrl?.trim();
    if (!url) return null;
    return stripWwwOrigin(url);
  }

  if (raw.linkType === 'internal' && raw.internalLink) {
    const resolved = resolveSanityDocumentHref(
      raw.internalLink as SanityLinkDocument,
      {
        surface: 'www',
        wwwOrigin: getWwwUrl(),
      },
    );
    if (!resolved?.href) return null;
    return stripWwwOrigin(resolved.href);
  }

  return null;
}

/**
 * Resolve a section chrome link (Internal | Site path | External).
 * Site path stays root-relative so the browser uses the current host.
 */
export function resolveSectionLinkHref(
  raw: SectionLinkHrefInput | null | undefined,
): ResolvedWwwHref | null {
  if (!raw) return null;

  if (raw.linkType === 'path') {
    const path = normalizeSitePath(raw.relativePath);
    if (!path) return null;
    return {href: path, external: false};
  }

  return resolveWwwNavHref({
    linkType: raw.linkType,
    externalUrl: raw.externalUrl,
    internalLink: raw.internalLink as WebsiteNavLinkDoc['internalLink'],
  });
}
