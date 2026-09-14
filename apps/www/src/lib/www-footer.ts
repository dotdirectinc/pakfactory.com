import {
  resolveFooterAiLinks,
  resolveFooterColumns,
  resolveFooterSocial,
} from '@/lib/footer-nav';
import {fetchWebsiteNavigation} from '@/lib/website-navigation';
import {
  buildWwwV5FooterColumns,
  FOOTER_AI_LINKS,
  FOOTER_CTA,
  FOOTER_SOCIAL,
} from '@/lib/www-nav';
import type {WebsiteNavigationDoc} from '@pakfactory/sanity/queries';

function fallbackFooter() {
  return {
    columns: buildWwwV5FooterColumns(),
    social: FOOTER_SOCIAL,
    aiLinks: FOOTER_AI_LINKS,
    cta: FOOTER_CTA,
  };
}

/** Map a fetched `websiteNavigation` doc to footer props (CTA stays code default). */
export function mapWwwFooterFromChrome(doc: WebsiteNavigationDoc) {
  if (!doc?._id) return fallbackFooter();

  return {
    columns: resolveFooterColumns(doc) ?? buildWwwV5FooterColumns(),
    social: resolveFooterSocial(doc) ?? FOOTER_SOCIAL,
    aiLinks: resolveFooterAiLinks(doc) ?? FOOTER_AI_LINKS,
    cta: FOOTER_CTA,
  };
}

export async function fetchWwwFooterData() {
  const chrome = await fetchWebsiteNavigation();
  return mapWwwFooterFromChrome(chrome);
}
