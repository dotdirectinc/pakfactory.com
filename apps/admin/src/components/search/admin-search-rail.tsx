"use client";

import {
  FileText,
  BookOpen,
  Boxes,
  Home,
  Layers,
  Package,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";
import { ADMIN_SEARCH_SCOPE_CATALOG } from "@/lib/search/scopes";
import type { AdminSearchScope } from "@/lib/search/types";

const SCOPE_ICONS: Record<AdminSearchScope, typeof Search> = {
  all: Search,
  requests: FileText,
  customers: Users,
  specs: Layers,
  products: Package,
  customizations: Boxes,
  blog: BookOpen,
  caseStudies: BookOpen,
  pages: Home,
};

export function AdminSearchRail({
  scope,
  onScopeChange,
  className,
}: {
  scope: AdminSearchScope;
  onScopeChange: (scope: AdminSearchScope) => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto md:w-44 md:shrink-0 md:flex-col md:overflow-visible",
        className,
      )}
      aria-label="Search scopes"
    >
      {ADMIN_SEARCH_SCOPE_CATALOG.map((item) => {
        const Icon = SCOPE_ICONS[item.id];
        const selected = scope === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onScopeChange(item.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
              selected
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              item.stub && !selected ? "opacity-70" : null,
            )}
          >
            <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{item.label}</span>
            {item.stub ? (
              <span className="ml-auto hidden text-[10px] uppercase tracking-wide text-muted-foreground md:inline">
                Soon
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
