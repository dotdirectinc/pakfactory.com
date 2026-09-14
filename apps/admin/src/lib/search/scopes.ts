import { SHELF_STUBS } from "./shelf";
import type { AdminSearchScope, AdminSearchFacet } from "./types";

/** Single catalog for rail + facet labels (DRY / ADR-013). Stub labels from shelf.ts. */
export const ADMIN_SEARCH_SCOPE_CATALOG: {
  id: AdminSearchScope;
  label: string;
  stub?: boolean;
  facet?: boolean;
}[] = [
  { id: "all", label: "All" },
  { id: "requests", label: "Requests", facet: true },
  {
    id: "customers",
    label: SHELF_STUBS.customers.label,
    stub: true,
  },
  {
    id: "specs",
    label: SHELF_STUBS.specs.label,
    stub: true,
  },
  { id: "products", label: "Products", facet: true },
  { id: "customizations", label: "Customizations", facet: true },
  { id: "blog", label: "Blog", facet: true },
  { id: "caseStudies", label: "Case studies", facet: true },
  { id: "pages", label: "Pages", facet: true },
];

export function facetLabel(id: AdminSearchFacet["id"]): string {
  return ADMIN_SEARCH_SCOPE_CATALOG.find((s) => s.id === id)?.label ?? id;
}

export function scopeLabel(id: AdminSearchScope): string {
  return ADMIN_SEARCH_SCOPE_CATALOG.find((s) => s.id === id)?.label ?? id;
}

export function isStubScope(scope: AdminSearchScope): boolean {
  return scope === "customers" || scope === "specs";
}
