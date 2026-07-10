import type { Metadata } from "next";
import { SiteNav } from "@pakfactory/ui/components/site-nav";
import { SiteFooter } from "@pakfactory/ui/components/site-footer";
import { SOFT_LAUNCH_NAV_LINKS, SOFT_LAUNCH_FOOTER_COLUMNS, SOFT_LAUNCH_SOCIAL_LINKS } from "@/lib/www-nav";
import { getSiteUrl } from "@/lib/site";
import { robotsDirectiveToMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return {
    robots: robotsDirectiveToMetadata({ index: true, follow: true }),
  };
}

const WWW_URL = getSiteUrl();

export default function CaseStudiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav
        navLinks={SOFT_LAUNCH_NAV_LINKS}
        getQuoteHref={`${WWW_URL}/contact`}
      />
      <main>{children}</main>
      <SiteFooter
        columns={SOFT_LAUNCH_FOOTER_COLUMNS}
        contactHref={`${WWW_URL}/contact`}
        social={SOFT_LAUNCH_SOCIAL_LINKS}
      />
    </>
  );
}
