import type { Metadata } from "next";
import { SiteNav } from "@pakfactory/components/layout/site-nav";
import type { NavCategory } from "@pakfactory/components/layout/site-nav";
import { SiteFooter } from "@pakfactory/components/layout/site-footer";
import { getWwwUrl } from "@/lib/site";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { BLOG_NAV_CATEGORIES_QUERY, BLOG_FOOTER_NAV_QUERY } from "@pakfactory/sanity/queries";
import type { RawFooterDoc } from "@/lib/footer-nav";
import {
  resolveFooterColumns,
  resolveFooterSocial,
  resolveFooterAiLinks,
} from "@/lib/footer-nav";
import {
  BLOG_URL,
  BLOG_CATEGORIES,
  FOOTER_COLUMNS,
  FOOTER_SOCIAL,
  FOOTER_AI_LINKS,
  buildFooterColumns,
} from "@/lib/www-nav";

export function generateMetadata(): Metadata {
  return {
    robots: robotsDirectiveToMetadata({ index: true, follow: true }),
  };
}

const WWW_URL = getWwwUrl();

type SanityNavCategory = {
  _id: string;
  title: string;
  navLabel?: string | null;
  slug: string;
};

async function fetchNavCategories(): Promise<NavCategory[]> {
  if (!isSanityConfigured()) return BLOG_CATEGORIES;
  try {
    const result = await getPublishedSanityClient().fetch<{
      categories?: SanityNavCategory[] | null;
    } | null>(BLOG_NAV_CATEGORIES_QUERY, { language: "en" });

    const cats = result?.categories?.filter((c) => !!c.slug) ?? [];
    if (cats.length === 0) return BLOG_CATEGORIES;

    return cats.map((c) => ({
      href: `${BLOG_URL}/${c.slug}`,
      title: (c.navLabel?.trim() || c.title) ?? c.title,
    }));
  } catch {
    return BLOG_CATEGORIES;
  }
}

async function fetchFooterData(navCategories: NavCategory[]) {
  if (!isSanityConfigured()) {
    return {
      columns: buildFooterColumns(navCategories),
      social: FOOTER_SOCIAL,
      aiLinks: FOOTER_AI_LINKS,
    };
  }

  try {
    const doc = await getPublishedSanityClient().fetch<RawFooterDoc>(
      BLOG_FOOTER_NAV_QUERY,
    );
    return {
      columns: resolveFooterColumns(doc) ?? buildFooterColumns(navCategories),
      social: resolveFooterSocial(doc) ?? FOOTER_SOCIAL,
      aiLinks: resolveFooterAiLinks(doc) ?? FOOTER_AI_LINKS,
    };
  } catch {
    return {
      columns: buildFooterColumns(navCategories),
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
  const navCategories = await fetchNavCategories();
  const footer = await fetchFooterData(navCategories);

  return (
    <>
      <SiteNav
        categories={navCategories}
        wwwHref={WWW_URL}
        blogHref={BLOG_URL}
        contactHref={`${WWW_URL}/contact`}
      />
      <main>{children}</main>
      <SiteFooter
        columns={footer.columns}
        contactHref={`${WWW_URL}/contact`}
        social={footer.social}
        aiLinks={footer.aiLinks}
      />
    </>
  );
}
