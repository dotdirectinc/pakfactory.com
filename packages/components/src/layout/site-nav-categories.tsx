"use client";

import { cn } from "@pakfactory/ui/lib/utils";

export type NavCategory = { href: string; title: string };

type Props = { categories: NavCategory[] };

export function SiteNavCategories({ categories }: Props) {
  return (
    <div className="hidden w-full items-center justify-between lg:flex">
      {categories.length > 0 ? (
        <nav className="flex min-w-0 flex-1 items-center gap-8 text-base font-medium" aria-label="Blog categories">
          {categories.map(({ href, title }) => (
            <a
              key={href}
              href={href}
              className={cn("text-foreground transition-colors hover:text-primary")}
            >
              {title}
            </a>
          ))}
        </nav>
      ) : (
        <div className="min-w-0 flex-1" />
      )}
    </div>
  );
}
