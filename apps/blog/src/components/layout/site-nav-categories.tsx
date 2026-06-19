"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@pakfactory/ui/lib/utils";
import type { BlogCategoryChip } from "@/lib/blog-categories";
import { categoryHref } from "@/lib/blog-post-url";

type SiteNavCategoriesProps = {
  categories: BlogCategoryChip[];
};

export function SiteNavCategories({ categories }: SiteNavCategoriesProps) {
  const pathname = usePathname();

  if (categories.length === 0) return null;

  return (
    <nav
      className="hidden items-center gap-8 text-base font-medium md:flex"
      aria-label="Blog categories"
    >
      {categories.map(({ slug, title }) => {
        const href = categoryHref(slug);
        const isActive =
          pathname === href || pathname.startsWith(`${href}/page/`);
        return (
          <Link
            key={slug}
            href={href}
            className={cn(
              "text-muted-foreground transition-colors hover:text-foreground",
              isActive && "font-semibold text-primary",
            )}
          >
            {title}
          </Link>
        );
      })}
    </nav>
  );
}
