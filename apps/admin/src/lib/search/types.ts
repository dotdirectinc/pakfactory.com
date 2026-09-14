/** Search scopes aligned with ADR-018. */
export const ADMIN_SEARCH_SCOPES = [
  "all",
  "requests",
  "customers",
  "specs",
  "products",
  "customizations",
  "blog",
  "caseStudies",
  "pages",
] as const;

export type AdminSearchScope = (typeof ADMIN_SEARCH_SCOPES)[number];

export type AdminSearchHitKind =
  | "request"
  | "product"
  | "customization"
  | "post"
  | "caseStudy"
  | "page";

export type AdminSearchHit = {
  id: string;
  kind: AdminSearchHitKind;
  title: string;
  subtitle?: string;
  href: string;
  external?: boolean;
  badge?: string;
};

export type AdminSearchSectionId =
  | "requests"
  | "products"
  | "customizations"
  | "blog"
  | "caseStudies"
  | "pages"
  | "customers"
  | "specs";

export type AdminSearchSection = {
  id: AdminSearchSectionId;
  title: string;
  hits: AdminSearchHit[];
  /** Honest empty / stub copy when hits are empty and the section is in scope. */
  emptyMessage?: string;
  stub?: boolean;
};

/** Shopify-style suggestion pills derived from the current query. */
export type AdminSearchFacet = {
  id: Exclude<AdminSearchSectionId, "customers" | "specs">;
  label: string;
  count: number;
};

export type AdminSearchResponse = {
  query: string;
  scope: AdminSearchScope;
  sections: AdminSearchSection[];
  facets: AdminSearchFacet[];
};

export function isAdminSearchScope(value: unknown): value is AdminSearchScope {
  return (
    typeof value === "string" &&
    (ADMIN_SEARCH_SCOPES as readonly string[]).includes(value)
  );
}

export function isNarrowingScope(
  scope: AdminSearchScope,
): scope is AdminSearchFacet["id"] {
  return scope !== "all" && scope !== "customers" && scope !== "specs";
}
