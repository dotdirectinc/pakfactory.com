import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { PageDielineSection } from "@/components/common/page-dieline-section";
import { SiteNavCategories } from "@/components/common/site-nav-categories";
import { getWwwUrl } from "@/lib/site";

const QUOTE_HREF = `${getWwwUrl()}/contact`;

export function SiteNav() {
  return (
    <header>
      {/* Top tier — PakFactory brand + search + quote CTA (Figma pro-blocks) */}
      <div className="border-b border-dashed border-border bg-background">
        <PageDielineSection innerClassName="flex h-16 items-center justify-between">
          <Link
            href={getWwwUrl()}
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
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Search blog"
              asChild
            >
              <Link href="/search">
                <Search className="size-[22px]" strokeWidth={1.75} />
              </Link>
            </Button>

            <Button
              className="hidden h-10 rounded-full bg-[#27272a] px-6 text-base font-medium text-white hover:bg-[#27272a]/90 sm:inline-flex"
              asChild
            >
              <a href={QUOTE_HREF}>Get A Quote</a>
            </Button>
          </div>
        </PageDielineSection>
      </div>

      {/* Bottom tier — Blog label + category navigation (Figma Navbar) */}
      <div className="border-b border-dashed border-border bg-background">
        <PageDielineSection innerClassName="flex h-16 items-center gap-8">
          <Link
            href="/"
            className="shrink-0 text-xl font-semibold tracking-tight text-foreground no-underline"
          >
            Blog
          </Link>
          <SiteNavCategories />
        </PageDielineSection>
      </div>
    </header>
  );
}
