/**
 * Website Navigation singleton — www site chrome (header + footer).
 * Document id: `websiteNavigation` (not page-builder sections).
 */

const LINKABLE_DOC_PROJECTION = /* groq */ `{
  _id,
  _type,
  title,
  "slug": slug.current,
  "name": name,
  "term": term,
  pageRole,
  pageType,
  category,
  "handle": handle.current,
  "collectionSlug": primaryCollection->slug.current,
  "pageSlug": primaryLandingPage->slug.current,
  status,
  customerFacing,
  hasPage,
  appearsIn,
  orderRank
}`;

/** Lean projection for resolving path URLs → catalog docs (nav visibility + order). */
const PATH_TARGET_PROJECTION = /* groq */ `{
  _type,
  status,
  customerFacing,
  hasPage,
  appearsIn,
  orderRank
}`;

/**
 * Resolve curated `linkType: path` catalog URLs to a document so chrome can
 * apply the same status / customerFacing / page gates as internal links.
 * Bare listing paths (`/products`, `/customizations`, …) stay null.
 */
const PATH_TARGET_RESOLVE = /* groq */ `select(
  linkType == "path" && defined(relativePath) => select(
    string::split(relativePath, "/")[1] == "products" &&
      count(string::split(relativePath, "/")) == 3 &&
      string::split(relativePath, "/")[2] != "" => coalesce(
        *[_type == "productLine" && slug.current == string::split(^.relativePath, "/")[2]][0]${PATH_TARGET_PROJECTION},
        *[_type == "product" && slug.current == string::split(^.relativePath, "/")[2]][0]${PATH_TARGET_PROJECTION}
      ),
    string::split(relativePath, "/")[1] == "products" &&
      count(string::split(relativePath, "/")) == 4 &&
      string::split(relativePath, "/")[2] != "" &&
      string::split(relativePath, "/")[3] != "" => *[
        _type == "productStyle" &&
        slug.current == string::split(^.relativePath, "/")[3] &&
        productLine->slug.current == string::split(^.relativePath, "/")[2]
      ][0]${PATH_TARGET_PROJECTION},
    string::split(relativePath, "/")[1] == "customizations" &&
      count(string::split(relativePath, "/")) == 3 &&
      string::split(relativePath, "/")[2] != "" => *[
        _type == "customizationOption" &&
        slug.current == string::split(^.relativePath, "/")[2]
      ][0]${PATH_TARGET_PROJECTION},
    null
  ),
  null
)`;

const NAV_LINK_FIELDS = /* groq */ `{
  label,
  linkType,
  externalUrl,
  relativePath,
  "internalLink": internalLink->${LINKABLE_DOC_PROJECTION},
  "pathTarget": ${PATH_TARGET_RESOLVE}
}`;

export const WEBSITE_NAVIGATION_QUERY = /* groq */ `*[_id == "websiteNavigation"][0]{
  _id,
  cta${NAV_LINK_FIELDS},
  items[]{
    label,
    groups[]{
      label,
      descriptor,
      items[]${NAV_LINK_FIELDS}
    },
    promo{
      heading,
      image{
        ...,
        "alt": coalesce(alt, asset->altText)
      },
      link${NAV_LINK_FIELDS}
    },
    footerCta${NAV_LINK_FIELDS}
  },
  columns[]{
    "sections": sections[]{
      title,
      "links": links[]${NAV_LINK_FIELDS}
    }
  },
  "social": socialLinks[]{ platform, url },
  "aiLinks": aiAnswerLinks[]{ "engine": platform, url }
}`;

export type WebsiteNavLinkTarget = {
  _id?: string;
  _type?: string;
  title?: string | null;
  slug?: string | null;
  name?: string | null;
  term?: string | null;
  pageRole?: string | null;
  pageType?: string | null;
  category?: string | null;
  handle?: string | null;
  collectionSlug?: string | null;
  pageSlug?: string | null;
  /** Catalog lifecycle — used to hide nav links (PROD-2620). */
  status?: string | null;
  /** Notion "Hidden" — unset counts as visible. */
  customerFacing?: boolean | null;
  /** Solutions / expertise services public page gate. */
  hasPage?: boolean | null;
  /** Customization option page gate (PROD-2732) — page-bearing `appearsIn` values. */
  appearsIn?: string | null;
  /**
   * LexoRank from `@sanity/orderable-document-list` (productLine). Used to sort
   * Products mega-menu links to match Studio drag order.
   */
  orderRank?: string | null;
};

export type WebsiteNavLinkDoc = {
  label?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  /** Root-relative site path when `linkType === 'path'` (e.g. `/products`). */
  relativePath?: string | null;
  internalLink?: WebsiteNavLinkTarget | null;
  /**
   * Catalog doc resolved from `relativePath` (products / customizations).
   * Null for listing paths or non-catalog URLs.
   */
  pathTarget?: WebsiteNavLinkTarget | null;
};

export type WebsiteNavigationDoc = {
  _id?: string;
  cta?: WebsiteNavLinkDoc | null;
  items?:
    | ({
        label?: string | null;
        groups?:
          | ({
              label?: string | null;
              descriptor?: string | null;
              items?: (WebsiteNavLinkDoc | null)[] | null;
            } | null)[]
          | null;
        promo?: {
          heading?: string | null;
          image?: {
            alt?: string | null;
            asset?: unknown;
            [key: string]: unknown;
          } | null;
          link?: WebsiteNavLinkDoc | null;
        } | null;
        footerCta?: WebsiteNavLinkDoc | null;
      } | null)[]
    | null;
  columns?:
    | ({
        sections?:
          | ({
              title?: string | null;
              links?: (WebsiteNavLinkDoc | null)[] | null;
            } | null)[]
          | null;
      } | null)[]
    | null;
  social?: ({platform?: string | null; url?: string | null} | null)[] | null;
  aiLinks?: ({engine?: string | null; url?: string | null} | null)[] | null;
} | null;
