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
  "pageSlug": primaryLandingPage->slug.current
}`;

const NAV_LINK_FIELDS = /* groq */ `{
  label,
  linkType,
  externalUrl,
  "internalLink": internalLink->${LINKABLE_DOC_PROJECTION}
}`;

export const WEBSITE_NAVIGATION_QUERY = /* groq */ `*[_id == "websiteNavigation"][0]{
  _id,
  cta{
    label,
    linkType,
    externalUrl,
    "internalLink": internalLink->${LINKABLE_DOC_PROJECTION}
  },
  items[]{
    label,
    groups[]{
      label,
      descriptor,
      items[]${NAV_LINK_FIELDS}
    }
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

export type WebsiteNavLinkDoc = {
  label?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  internalLink?: {
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
  } | null;
};

export type WebsiteNavigationDoc = {
  _id?: string;
  cta?: {
    label?: string | null;
    linkType?: string | null;
    externalUrl?: string | null;
    internalLink?: WebsiteNavLinkDoc['internalLink'];
  } | null;
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
