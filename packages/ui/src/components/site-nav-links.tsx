"use client";

import Link from "next/link";
import type {SiteNavItem} from "@pakfactory/ui/components/site-nav";

type SiteNavLinksProps = {
  items: SiteNavItem[];
};

export function SiteNavLinks({items}: SiteNavLinksProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className="hidden items-center gap-6 text-base font-medium text-foreground md:flex"
      aria-label="Site navigation"
    >
      {items.map((item) => {
        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              className="py-2 text-foreground no-underline transition-colors hover:text-foreground/80"
            >
              {item.label}
            </Link>
          );
        }

        return (
          <span
            key={item.key}
            className="cursor-default py-2 text-foreground"
            aria-disabled="true"
          >
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}
