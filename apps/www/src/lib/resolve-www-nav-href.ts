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
