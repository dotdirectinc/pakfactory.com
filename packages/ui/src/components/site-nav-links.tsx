"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@pakfactory/ui/lib/utils";
import type {SiteNavItem} from "@pakfactory/ui/components/site-nav";

type SiteNavLinksProps = {
  items: SiteNavItem[];
};

export function isSiteNavHrefActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavLinks({items}: SiteNavLinksProps) {
  const pathname = usePathname();

  if (items.length === 0) return null;

  return (
    <nav
      className="hidden items-center gap-6 text-sm font-medium md:flex"
      aria-label="Site navigation"
    >
      {items.map((item) => {
        if (item.href) {
          const isActive = isSiteNavHrefActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "py-2 no-underline transition-colors hover:text-primary",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <span
            key={item.key}
            className="cursor-default py-2 text-muted-foreground"
            aria-disabled="true"
          >
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}
