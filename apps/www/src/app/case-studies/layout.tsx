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
} from "@/lib/footer-nav";
import { fetchWwwPrimaryNav } from "@/lib/www-primary-nav";
import {
  BLOG_URL,
  buildFooterColumns,
  FOOTER_AI_LINKS,
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
    };
  } catch {
    return {
      columns: buildFooterColumns(navItems),
      social: FOOTER_SOCIAL,
      aiLinks: FOOTER_AI_LINKS,
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
      />
      <main>{children}</main>
      <SiteFooter
        columns={footer.columns}
        contactHref={`${BLOG_URL}/contribute`}
        contactLabel="Let's talk packaging"
        social={footer.social}
        aiLinks={footer.aiLinks}
      />
    </>
  );
}
