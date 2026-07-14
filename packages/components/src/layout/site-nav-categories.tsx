"use client";

import { PrimaryNavLink } from "./primary-nav-link";
import type { PrimaryNavItem } from "./primary-nav-types";

type Props = { navItems: PrimaryNavItem[] };

export function SiteNavCategories({ navItems }: Props) {
  return (
    <div className="hidden w-full items-center lg:flex">
      {navItems.length > 0 ? (
        <nav
          className="flex min-w-0 flex-1 items-center gap-8 text-sm font-medium"
          aria-label="Blog navigation"
        >
          {navItems.map((item) => (
            <PrimaryNavLink
              key={item.key}
              item={item}
              className="text-foreground transition-colors hover:text-primary"
            />
          ))}
        </nav>
      ) : (
        <div className="min-w-0 flex-1" />
      )}
    </div>
  );
}
