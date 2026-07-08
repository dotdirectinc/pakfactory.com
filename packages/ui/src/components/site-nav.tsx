import type { ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";
import { SiteNavLinks } from "@pakfactory/ui/components/site-nav-links";

export type NavLink = { href: string; label: string };

export type SiteNavProps = {
  /** Second-tier nav links (category list for blog; soft-launch destinations for www). */
  navLinks: NavLink[];
  /** Absolute URL for the "Get A Quote" CTA. */
  getQuoteHref: string;
  /** If set, renders a search icon linking to this path. */
  searchHref?: string;
  /**
   * Optional slot rendered inside the sticky header below the category row —
   * the blog uses this for its reading-progress bar.
   */
  progressSlot?: ReactNode;
};

export function SiteNav({
  navLinks,
  getQuoteHref,
  searchHref,
  progressSlot,
}: SiteNavProps) {
  return (
    <header className="sticky -top-16 z-40">
      {/* Top tier — PakFactory brand + optional search + quote CTA */}
      <div className="border-b border-dashed border-border bg-background">
        <PageDielineSection innerClassName="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 no-underline"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
              PF
            </span>
            <span className="text-xl font-semibold tracking-tight text-foreground">
              PakFactory
            </span>
          </Link>

          <div className="flex items-center gap-5">
            {searchHref && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="Search blog"
                asChild
              >
                <Link href={searchHref}>
                  <Search className="size-[22px]" strokeWidth={1.75} />
                </Link>
              </Button>
            )}

            <Button
              className="hidden h-10 rounded-full bg-[#27272a] px-6 text-base font-medium text-white hover:bg-[#27272a]/90 sm:inline-flex"
              asChild
            >
              <a href={getQuoteHref}>Get A Quote</a>
            </Button>
          </div>
        </PageDielineSection>
      </div>

      {/* Bottom tier — nav links */}
      <div className="bg-background">
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
    </header>
  );
}
