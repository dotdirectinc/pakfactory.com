export const POSTS_QUERY = /* groq */ `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage,
  "author": author->{name, "slug": slug.current}
}`;

export const POST_BY_SLUG_QUERY = /* groq */ `*[_type == "post" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  body,
  publishedAt,
  mainImage,
  "author": author->{name, "slug": slug.current, image}
}`;

export const SITE_SETTINGS_QUERY = /* groq */ `*[_type == "siteSettings"][0]{
  title,
  description,
  url
}`;

/** Singleton home document (no slug). First published homePage or none. */
export const HOME_PAGE_QUERY = /* groq */ `*[_type == "homePage"] | order(_updatedAt desc)[0]{
  _id,
  title,
  heroHeadline,
  body,
  seo
}`;

/**
 * Product PDP: handle + primary landing page slug + primary collection slug.
 * Landing page may be capabilityPage, productPage, or staticPage (all have slug).
 */
export const PRODUCT_BY_PATH_QUERY = /* groq */ `*[
  _type == "product" &&
  handle.current == $handle &&
  primaryCollection->slug.current == $collectionSlug &&
  primaryLandingPage->slug.current == $pageSlug
][0]{
  _id,
  title,
  "handle": handle.current,
  description,
  specs,
  media,
  seo,
  "primaryLandingPage": primaryLandingPage->{
    _type,
    title,
    "slug": slug.current
  },
  "primaryCollection": primaryCollection->{
    _id,
    title,
    "slug": slug.current,
    "defaultCapabilities": defaultCapabilities[]->{ _id, title, "slug": slug.current }
  },
  "landingPageId": primaryLandingPage._ref,
  "collectionId": primaryCollection._ref
}`;

/** For generateStaticParams: all path segments must be defined on primaries. */
export const PRODUCT_PATHS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(handle.current) &&
  defined(primaryCollection->slug.current) &&
  defined(primaryLandingPage->slug.current)
]{
  "pageSlug": primaryLandingPage->slug.current,
  "collectionSlug": primaryCollection->slug.current,
  "handle": handle.current
}`;

/** Product landing page (`productPage`) by URL segment + resolved related collections. */
export const PRODUCT_PAGE_BY_SLUG_QUERY = /* groq */ `*[_type == "productPage" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  heroHeadline,
  solutionType,
  standardBody,
  industryBody,
  body,
  seo,
  includeCollectionsFromProducts,
  "manualCollections": relatedCollections[]{
    "_id": collection->_id,
    "title": collection->title,
    "slug": collection->slug.current,
    "thumbUrl": coalesce(image.asset->url, collection->bannerImage.asset->url, collection->hero.image.asset->url),
    "thumbAlt": coalesce(image.alt, collection->bannerImage.alt, collection->hero.image.alt, collection->title)
  }
}`;

/** Unique `productCollection` IDs from products on this `productPage` (one collection per product). */
const productCollectionRefsForPageIdExpr = /* groq */ `array::unique(*[_type == "product" && primaryLandingPage._ref == $pageId && defined(primaryCollection._ref)].primaryCollection._ref)`;

export const PRODUCT_COLLECTION_REFS_FOR_PAGE_ID_QUERY = productCollectionRefsForPageIdExpr;

/** `productCollection` rows from products on this landing page; use published id for `$pageId`. */
export const PRODUCT_COLLECTIONS_FROM_PRODUCTS_FOR_PAGE_ID_QUERY = /* groq */ `*[_type == "productCollection" && _id in ${productCollectionRefsForPageIdExpr}] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  "thumbUrl": coalesce(bannerImage.asset->url, hero.image.asset->url),
  "thumbAlt": coalesce(bannerImage.alt, hero.image.alt, title)
}`;

/** Draft-aware slice for Studio product page Collections tab (`$docId` = pane document id, including `drafts.`). */
export const PRODUCT_PAGE_STUDIO_COLLECTIONS_PANEL_QUERY = /* groq */ `*[_id == $docId][0]{
  includeCollectionsFromProducts,
  "manualCollections": relatedCollections[]{
    "_id": collection->_id,
    "title": collection->title,
    "slug": collection->slug.current,
    "thumbUrl": coalesce(image.asset->url, collection->bannerImage.asset->url, collection->hero.image.asset->url),
    "thumbAlt": coalesce(image.alt, collection->bannerImage.alt, collection->hero.image.alt, collection->title)
  }
}`;

/** Resolve collection documents by ID (for catalog merge). */
export const PRODUCT_COLLECTIONS_BY_IDS_QUERY = /* groq */ `*[_type == "productCollection" && _id in $ids]{
  _id,
  title,
  "slug": slug.current,
  "thumbUrl": coalesce(bannerImage.asset->url, hero.image.asset->url),
  "thumbAlt": coalesce(bannerImage.alt, hero.image.alt, title)
}`;

/**
 * Capabilities (materials / finishes) applicable to a product, derived from
 * which capabilityCategory docs reference the product's landing page or collection.
 */
export const CAPABILITIES_FOR_PRODUCT_REFS_QUERY = /* groq */ `*[
  _type == "capabilityCategory" &&
  (
    ($landingPageId != null && $landingPageId in landingPages[]._ref) ||
    ($collectionId != null && $collectionId in collections[]._ref)
  )
] | order(category asc, title asc) {
  _id,
  title,
  "slug": slug.current,
  category
}`;

/** Single `capabilityCategory` by category + slug (for capability detail page). */
export const CAPABILITY_BY_CATEGORY_AND_SLUG_QUERY = /* groq */ `*[
  _type == "capabilityCategory" &&
  category == $category &&
  slug.current == $slug
][0]{
  _id,
  title,
  "slug": slug.current,
  category,
  description,
  "gallery": gallery[]{
    "url": asset->url,
    alt
  },
  "landingPages": landingPages[]->{
    _id,
    title,
    "slug": slug.current
  },
  "collections": collections[]->{
    _id,
    title,
    "slug": slug.current,
    "thumbUrl": coalesce(bannerImage.asset->url, hero.image.asset->url),
    "thumbAlt": coalesce(bannerImage.alt, hero.image.alt, title),
    "landingPageSlug": coalesce(
      landingPage->slug.current,
      *[_type == "product" && primaryCollection._ref == ^._id][0].primaryLandingPage->slug.current
    )
  }
}`;

/** All `capabilityCategory` paths (for generateStaticParams). */
export const CAPABILITY_PATHS_QUERY = /* groq */ `*[
  _type == "capabilityCategory" &&
  defined(slug.current) &&
  defined(category)
]{
  category,
  "handle": slug.current
}`;

/** Products referencing a `productCollection` id (use published id, not `drafts.*`). */
export const PRODUCTS_FOR_COLLECTION_ID_QUERY = /* groq */ `*[_type == "product" && primaryCollection._ref == $collectionId] | order(title asc) {
  _id,
  title,
  "handle": handle.current,
  "pageSlug": primaryLandingPage->slug.current,
  "thumbUrl": media[0].asset->url,
  "thumbAlt": coalesce(media[0].alt, title)
}`;

/** All `productPage` rows (for index + landing static params). */
export const PRODUCT_PAGE_SLUGS_QUERY = /* groq */ `*[_type == "productPage" && defined(slug.current)] | order(title asc) {
  title,
  "slug": slug.current
}`;

/**
 * Program + collection segments from every published product path.
 * Dedupe `{ pageSlug, collectionSlug }` in the app (e.g. Set) for `generateStaticParams`.
 */
export const PRODUCT_PAGE_COLLECTION_PATHS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(handle.current) &&
  defined(primaryCollection->slug.current) &&
  defined(primaryLandingPage->slug.current)
]{
  "pageSlug": primaryLandingPage->slug.current,
  "collectionSlug": primaryCollection->slug.current
}`;

/**
 * Collection listing: same path resolution as PDP (`primaryLandingPage` + primary collection ref).
 */
export const PRODUCTS_FOR_PAGE_AND_COLLECTION_QUERY = /* groq */ `*[
  _type == "product" &&
  primaryLandingPage->slug.current == $pageSlug &&
  primaryCollection->slug.current == $collectionSlug
] | order(title asc) {
  _id,
  title,
  "name": coalesce(cardName, title),
  "description": cardDescription,
  "handle": handle.current,
  "thumbUrl": media[0].asset->url,
  "thumbAlt": coalesce(media[0].alt, title)
}`;

/** Collection document for a path (via any product on that path); null if no products. */
export const PRODUCT_COLLECTION_META_FOR_PATH_QUERY = /* groq */ `*[
  _type == "product" &&
  primaryLandingPage->slug.current == $pageSlug &&
  primaryCollection->slug.current == $collectionSlug
][0]{
  "collection": primaryCollection->{
    _id,
    title,
    "slug": slug.current,
    "heroTitle": hero.title,
    "heroHeadline": hero.headline,
    "heroDescription": hero.description,
    "bannerUrl": coalesce(bannerImage.asset->url, hero.image.asset->url),
    "bannerAlt": coalesce(bannerImage.alt, hero.image.alt, title)
  }
}`;

/** Capability catalog: all capabilityPage docs with materials/finishes + hero image. */
export const CAPABILITY_CATALOG_QUERY = /* groq */ `*[_type == "capabilityPage" && defined(slug.current)] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  heroHeadline,
  "materials": materials[]->{ _id, title, "slug": slug.current },
  "finishes": finishes[]->{ _id, title, "slug": slug.current },
  "imageUrl": coalesce(
    materials[0]->gallery[0].asset->url,
    finishes[0]->gallery[0].asset->url
  ),
  "imageAlt": coalesce(
    materials[0]->gallery[0].alt,
    finishes[0]->gallery[0].alt,
    title
  )
}`;

/** Capabilities landing: all `capabilityCategory` entries (materials / finishes) for index cards. */
export const CAPABILITY_CATEGORY_ENTRIES_QUERY = /* groq */ `*[
  _type == "capabilityCategory" &&
  defined(slug.current) &&
  defined(category)
] | order(category asc, title asc) {
  _id,
  title,
  "slug": slug.current,
  category,
  "imageUrl": gallery[0].asset->url,
  "imageAlt": coalesce(gallery[0].alt, title)
}`;

/** All product pages with their associated products (for catalog/grid index). */
export const ALL_PRODUCT_PAGES_WITH_PRODUCTS_QUERY = /* groq */ `*[_type == "productPage" && defined(slug.current)] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  "heroHeadline": coalesce(heroHeadline, title),
  solutionType,
  "products": *[_type == "product" && primaryLandingPage._ref == ^._id] | order(title asc) {
    _id,
    "sku": handle.current,
    "pageSlug": ^.slug.current,
    "collectionSlug": primaryCollection->slug.current,
    "name": coalesce(cardName, title),
    "description": cardDescription,
    "thumbUrl": media[0].asset->url,
    "thumbAlt": coalesce(media[0].alt, title)
  }
}`;
