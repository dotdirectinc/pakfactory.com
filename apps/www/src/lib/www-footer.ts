import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  resolveFooterAiLinks,
  resolveFooterColumns,
  resolveFooterCta,
  resolveFooterSocial,
  type RawFooterDoc,
} from "@/lib/footer-nav";
import {
  buildWwwV5FooterColumns,
  FOOTER_AI_LINKS,
  FOOTER_CTA,
  FOOTER_SOCIAL,
} from "@/lib/www-nav";
import { BLOG_FOOTER_NAV_QUERY } from "@pakfactory/sanity/queries";

export async function fetchWwwFooterData() {
  if (!isSanityConfigured()) {
    return {
      columns: buildWwwV5FooterColumns(),
      social: FOOTER_SOCIAL,
      aiLinks: FOOTER_AI_LINKS,
      cta: FOOTER_CTA,
    };
  }

  try {
    const doc = await getPublishedSanityClient().fetch<RawFooterDoc>(
      BLOG_FOOTER_NAV_QUERY,
    );
    return {
      columns: resolveFooterColumns(doc) ?? buildWwwV5FooterColumns(),
      social: resolveFooterSocial(doc) ?? FOOTER_SOCIAL,
      aiLinks: resolveFooterAiLinks(doc) ?? FOOTER_AI_LINKS,
      cta: resolveFooterCta(doc) ?? FOOTER_CTA,
    };
  } catch {
    return {
      columns: buildWwwV5FooterColumns(),
      social: FOOTER_SOCIAL,
      aiLinks: FOOTER_AI_LINKS,
      cta: FOOTER_CTA,
    };
  }
}
