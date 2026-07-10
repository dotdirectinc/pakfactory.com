import { Box } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import type { NavCategory } from "./site-nav-categories";
import { SiteNavCategories } from "./site-nav-categories";
import {
  SiteNavCompactActions,
  SiteNavCompactProvider,
  SiteNavTopRow,
} from "./site-nav-compact";

type Props = {
  categories: NavCategory[];
  wwwHref: string;
  blogHref: string;
  contactHref: string;
};

export function SiteNav({ categories, wwwHref, blogHref, contactHref }: Props) {
  return (
    <header className="sticky -top-0 z-40 lg:-top-16">
      <div className="bg-background">
        <SiteNavCompactProvider categories={categories} contactHref={contactHref}>
          <SiteNavTopRow>
            <div className="flex shrink-0 items-center gap-2">
              <a href={wwwHref} className="flex items-center gap-3 no-underline">
                <Box className="size-7 text-foreground" strokeWidth={1.75} aria-hidden />
                <span className="text-[15px] font-semibold tracking-tight text-foreground lg:text-xl">
                  PakFactory
                </span>
              </a>
              <a
                href={blogHref}
                className="text-[15px] font-medium tracking-tight text-muted-foreground no-underline lg:text-xl"
              >
                Blog
              </a>
            </div>
            <Button
              className="hidden h-10 rounded-full bg-primary px-6 text-base font-medium text-white hover:bg-primary/90 lg:inline-flex"
              asChild
            >
              <a href={contactHref}>Contact Us</a>
            </Button>
            <SiteNavCompactActions />
          </SiteNavTopRow>
        </SiteNavCompactProvider>
      </div>

      <div className="bg-background">
        <div className="hidden border-b border-dashed border-border lg:block">
          <div className="mx-auto flex h-16 max-w-[var(--layout-max)] items-center px-8">
            <SiteNavCategories categories={categories} />
          </div>
        </div>
      </div>
    </header>
  );
}

export type { NavCategory };
