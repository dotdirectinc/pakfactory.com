import type { Metadata } from "next";
import { SiteNav } from "@pakfactory/components/layout/site-nav";
import { SiteFooter } from "@pakfactory/components/layout/site-footer";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { BLOG_FOOTER_NAV_QUERY } from "@pakfactory/sanity/queries";
import type { RawFooterDoc } from "@/lib/footer-nav";
import {
  resolveFooterColumns,
  resolveFooterSocial,
  resolveFooterAiLinks,
  resolveFooterCta,
} from "@/lib/footer-nav";
import { fetchWwwPrimaryNav } from "@/lib/www-primary-nav";
import {
  BLOG_URL,
  buildFooterColumns,
  FOOTER_AI_LINKS,
  FOOTER_CTA,
  FOOTER_SOCIAL,
} from "@/lib/www-nav";

export function generateMetadata(): Metadata {
  return {
    robots: robotsDirectiveToMetadata({ index: true, follow: true }),
  };
}

async function fetchFooterData(navItems: Awaited<ReturnType<typeof fetchWwwPrimaryNav>>["navItems"]) {
  if (!isSanityConfigured()) {
    return {
      columns: buildFooterColumns(navItems),
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
      columns: resolveFooterColumns(doc) ?? buildFooterColumns(navItems),
      social: resolveFooterSocial(doc) ?? FOOTER_SOCIAL,
      aiLinks: resolveFooterAiLinks(doc) ?? FOOTER_AI_LINKS,
      cta: resolveFooterCta(doc) ?? FOOTER_CTA,
    };
  } catch {
    return {
      columns: buildFooterColumns(navItems),
      social: FOOTER_SOCIAL,
      aiLinks: FOOTER_AI_LINKS,
      cta: FOOTER_CTA,
    };
  }
}

export default async function CaseStudiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const primaryNav = await fetchWwwPrimaryNav();
  const footer = await fetchFooterData(primaryNav.navItems);

  return (
    <>
      <SiteNav
        navItems={primaryNav.navItems}
        header={primaryNav.header}
        homeHref={BLOG_URL}
        sticky={false}
      />
      <main>{children}</main>
      <SiteFooter
        columns={footer.columns}
        contactHref={footer.cta.href}
        contactLabel={footer.cta.label}
        social={footer.social}
        aiLinks={footer.aiLinks}
      />
    </>
  );
}
