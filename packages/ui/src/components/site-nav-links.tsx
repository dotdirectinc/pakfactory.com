"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@pakfactory/ui/lib/utils";
import type { NavLink } from "@pakfactory/ui/components/site-nav";

type SiteNavLinksProps = {
  links: NavLink[];
};

export function SiteNavLinks({ links }: SiteNavLinksProps) {
  const pathname = usePathname();

  if (links.length === 0) return null;

  return (
    <nav
      className="hidden items-center gap-8 text-base font-medium md:flex"
      aria-label="Site navigation"
    >
      {links.map(({ href, label }) => {
        const isActive =
          pathname === href || pathname.startsWith(`${href}/page/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "text-muted-foreground transition-colors hover:text-foreground",
              isActive && "font-semibold text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
