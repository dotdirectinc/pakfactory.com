import type { ReactNode } from "react";
import Link from "next/link";
import { Box } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";
import { SiteNavLinks } from "@pakfactory/ui/components/site-nav-links";
import { SiteNavMobile } from "@pakfactory/ui/components/site-nav-mobile";

export type NavLink = { href: string; label: string };

export type SiteNavProps = {
  /** Second-tier nav links shown on desktop. */
  navLinks: NavLink[];
  /** Absolute URL for the primary CTA button. */
  getQuoteHref: string;
  /** CTA button label. Defaults to "Get A Quote". */
  ctaLabel?: string;
  /**
   * Optional slot rendered inside the sticky header below the nav row —
   * the blog uses this for its reading-progress bar.
   */
  progressSlot?: ReactNode;
};

export function SiteNav({
  navLinks,
  getQuoteHref,
  ctaLabel = "Get A Quote",
  progressSlot,
}: SiteNavProps) {
  return (
    <header className="sticky top-0 z-40 lg:-top-16">
      {/* Top tier — PakFactory brand + desktop CTA + mobile hamburger */}
      <div className="border-b border-dashed border-border bg-background">
        <PageDielineSection innerClassName="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 no-underline"
          >
            <Box
              className="size-7 text-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="text-[15px] font-semibold tracking-tight text-foreground lg:text-xl">
              PakFactory
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              className="hidden h-10 rounded-full bg-primary px-6 text-base font-medium text-white hover:bg-primary/90 lg:inline-flex"
              asChild
            >
              <a href={getQuoteHref}>{ctaLabel}</a>
            </Button>

            <SiteNavMobile
              navLinks={navLinks}
              getQuoteHref={getQuoteHref}
              ctaLabel={ctaLabel}
            />
          </div>
        </PageDielineSection>
      </div>

      {/* Bottom tier — nav links (desktop only) */}
      <div className="hidden bg-background lg:block">
        <div className="border-b border-dashed border-border">
          <PageDielineSection innerClassName="flex h-16 items-center gap-8">
            <SiteNavLinks links={navLinks} />
          </PageDielineSection>
        </div>
        {progressSlot && (
          <PageDielineSection innerClassName="px-0">
            {progressSlot}
          </PageDielineSection>
        )}
      </div>

      {/* Progress slot — always rendered even on mobile (e.g. reading progress bar) */}
      {progressSlot && (
        <div className="lg:hidden">
          <PageDielineSection innerClassName="px-0">
            {progressSlot}
          </PageDielineSection>
        </div>
      )}
    </header>
  );
}
