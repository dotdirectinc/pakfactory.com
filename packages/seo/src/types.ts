/**
 * schema.org JSON-LD helpers — plain objects only (no runtime deps).
 *
 * @see https://schema.org/
 */

export const SCHEMA_CONTEXT = "https://schema.org" as const;

/** Top-level document or @graph wrapper */
export type JsonLdDocument = Record<string, unknown>;

export type OrganizationInput = {
  /** Display name */
  name: string;
  /** Canonical site URL (absolute) */
  url: string;
  /** Optional absolute URL to logo image */
  logo?: string;
  /** Same-as profiles */
  sameAs?: string[];
  /** Stable node id for @graph linking (absolute URI, often with #fragment) */
  id?: string;
};

export type PersonInput = {
  name: string;
  /** Absolute URL (e.g. author page) */
  url?: string;
  /** Absolute URL to portrait image */
  image?: string;
  /** Stable node id for @graph linking */
  id?: string;
  /** Role / title, e.g. "Senior Packaging Engineer" */
  jobTitle?: string;
  /** Short plain-text bio */
  description?: string;
  /** Absolute profile URLs (e.g. LinkedIn) for E-E-A-T */
  sameAs?: string[];
};

export type BreadcrumbItem = {
  name: string;
  /** Absolute URL of the crumb target */
  url: string;
};

export type CollectionPageInput = {
  name: string;
  /** Canonical URL of the listing page */
  url: string;
  description?: string;
  /** Stable node id */
  id?: string;
};

export type WebPageInput = {
  name: string;
  /** Canonical URL of the page */
  url: string;
  description?: string;
  /** Publisher site or parent WebSite node / @id reference */
  isPartOf?: Record<string, unknown>;
  /** Stable node id */
  id?: string;
};

export type ItemListEntry = {
  name: string;
  /** Absolute URL of the list item */
  url: string;
};

export type ItemListInput = {
  items: readonly ItemListEntry[];
  name?: string;
  /** Stable node id */
  id?: string;
};

export type BlogInput = {
  name: string;
  /** Canonical URL of the blog home */
  url: string;
  description?: string;
  /** Publisher Organization node or @id reference */
  publisher?: Record<string, unknown>;
  id?: string;
};

/** Shared shape for BlogPosting / NewsArticle generators */
export type ArticleLikeInput = {
  /** Canonical URL of the article */
  url: string;
  headline: string;
  /** ISO 8601 date-time string (omit only when genuinely unknown — rich results prefer this set) */
  datePublished?: string;
  dateModified?: string;
  description?: string;
  /** Absolute image URL(s) */
  image?: string | readonly string[];
  /**
   * Nested schema.org Person / Organization, or a reference object `{ "@id": "..." }`.
   */
  author?: Record<string, unknown>;
  publisher: Record<string, unknown>;
  /** Defaults to WebPage for the article URL */
  mainEntityOfPage?: {
    "@type": "WebPage";
    "@id": string;
  };
  articleSection?: string;
  keywords?: string | readonly string[];
  /** Stable node id for this article in @graph */
  id?: string;
};

export type BlogPostingInput = ArticleLikeInput;

export type NewsArticleInput = ArticleLikeInput;
