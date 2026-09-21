import type {
  AiEngine,
  AiLink,
  FooterColumns,
  FooterLink,
  SocialLink,
  SocialPlatform,
} from '@pakfactory/ui/components/site-footer';
import type {
  WebsiteNavigationDoc,
  WebsiteNavLinkDoc,
} from '@pakfactory/sanity/queries';
import {resolveWwwNavHref} from '@/lib/resolve-www-nav-href';

const SOCIAL_PLATFORMS = new Set<string>([
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
  'pinterest',
  'x',
]);

const AI_ENGINES = new Set<string>([
  'chatgpt',
  'gemini',
  'perplexity',
  'claude',
  'grok',
]);

function resolveLink(raw: WebsiteNavLinkDoc): FooterLink | null {
  const label = raw.label?.trim();
  if (!label) return null;

  const resolved = resolveWwwNavHref(raw);
  if (!resolved) return null;

  return {
    label,
    href: resolved.href,
    ...(resolved.external ? {external: true} : {}),
  };
}

/** Returns resolved columns, or null if the doc is missing/empty (caller should fall back). */
export function resolveFooterColumns(
  doc: WebsiteNavigationDoc,
): FooterColumns | null {
  if (!doc?._id) return null;

  const columns = (doc.columns ?? [])
    .filter((c): c is NonNullable<typeof c> => c != null)
    .map((col) =>
      (col.sections ?? [])
        .filter((s): s is NonNullable<typeof s> => s != null)
        .map((sec) => {
          const title = sec.title?.trim() ?? '';
          const links = (sec.links ?? [])
            .filter((l): l is WebsiteNavLinkDoc => l != null)
            .map(resolveLink)
            .filter((l): l is FooterLink => l != null);
          return {title, links};
        })
        .filter((s) => s.title && s.links.length > 0),
    )
    .filter((col) => col.length > 0);

  return columns.length > 0 ? columns : null;
}

export function resolveFooterSocial(
  doc: WebsiteNavigationDoc,
): SocialLink[] | null {
  if (!doc?._id) return null;
  const links = (doc.social ?? [])
    .filter(
      (s): s is {platform: string; url: string} => !!s?.platform && !!s?.url,
    )
    .filter((s) => SOCIAL_PLATFORMS.has(s.platform))
    .map((s) => ({
      platform: s.platform as SocialPlatform,
      url: s.url,
    }));
  return links.length > 0 ? links : null;
}

export function resolveFooterAiLinks(
  doc: WebsiteNavigationDoc,
): AiLink[] | null {
  if (!doc?._id) return null;
  const links = (doc.aiLinks ?? [])
    .filter(
      (a): a is {engine: string; url: string} => !!a?.engine && !!a?.url,
    )
    .filter((a) => AI_ENGINES.has(a.engine))
    .map((a) => ({engine: a.engine as AiEngine, url: a.url}));
  return links.length > 0 ? links : null;
}
