import Image from "next/image";
import Link from "next/link";
import { Box } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";
import { externalLinkAttributes } from "@pakfactory/components/commons/external-link";
import { SiteNavCategories } from "./site-nav-categories";
import {
  SiteNavCompactActions,
  SiteNavCompactProvider,
  SiteNavTopRow,
} from "./site-nav-compact";
import type { PrimaryNavHeader, PrimaryNavItem } from "./primary-nav-types";

export type { PrimaryNavHeader, PrimaryNavItem } from "./primary-nav-types";

type Props = {
  navItems: PrimaryNavItem[];
  header: PrimaryNavHeader;
  homeHref: string;
};

export function SiteNav({ navItems, header, homeHref }: Props) {
  const { logo, cta } = header;

  return (
    <header className="sticky -top-0 z-40 lg:-top-16">
      <div className="bg-background">
        <SiteNavCompactProvider navItems={navItems} cta={cta}>
          <SiteNavTopRow>
            <Link
              href={homeHref}
              className="group flex shrink-0 items-center gap-2 no-underline"
            >
              {logo ? (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width ?? 160}
                  height={logo.height ?? 32}
                  className="h-8 w-auto"
                  priority
                />
              ) : (
                <>
                  <Box
                    className="size-7 text-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="text-[15px] font-semibold tracking-tight text-foreground lg:text-xl">
                    PakFactory
                  </span>
                </>
              )}
              <span className="text-[15px] font-medium tracking-tight text-muted-foreground transition-colors group-hover:text-primary lg:text-xl">
                Blog
              </span>
            </Link>

            <Button
              className="hidden h-10 rounded-full bg-primary px-6 text-base font-medium text-white hover:bg-primary/90 lg:inline-flex"
              asChild
            >
              {cta.external ? (
                <a href={cta.href} {...externalLinkAttributes(cta.href)}>
                  {cta.label}
                </a>
              ) : (
                <Link href={cta.href}>{cta.label}</Link>
              )}
            </Button>

            <SiteNavCompactActions />
          </SiteNavTopRow>
        </SiteNavCompactProvider>
      </div>

      <div className="bg-background">
        <div className="hidden border-b border-dashed border-border lg:block">
          <PageDielineSection innerClassName="flex h-16 items-center">
            <SiteNavCategories navItems={navItems} />
          </PageDielineSection>
        </div>
      </div>
    </header>
  );
}
