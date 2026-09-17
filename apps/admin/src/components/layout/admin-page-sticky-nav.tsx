"use client";

import type { ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import { AdminPageContainer } from "@/components/layout/admin-page-container";

export type AdminPageStickyNavItem = {
  href: string;
  label: string;
};

export function AdminPageStickyNav({
  items,
  trailing,
  className,
}: {
  items: readonly AdminPageStickyNavItem[];
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b border-border bg-background",
        className,
      )}
    >
      <AdminPageContainer className="flex flex-wrap items-center gap-4 py-3">
        <nav className="flex flex-wrap gap-1" aria-label="Page sections">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius-control)] px-3 py-2 text-xs font-semibold text-muted-foreground no-underline hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        {trailing ? (
          <>
            <div className="flex-1" />
            {trailing}
          </>
        ) : null}
      </AdminPageContainer>
    </div>
  );
}
