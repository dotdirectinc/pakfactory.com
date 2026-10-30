/**
 * Glossary GROQ — the term page at `/glossary/<slug>` (PROD-3218, rendered in
 * PROD-3219). `/glossary` sits at the root, not under `/resources` like guides
 * and dielines; `resolve-document-href.ts` already maps the type that way.
 *
 * 🔴 The page has blocks of two kinds and the difference is the whole design:
 *
 *   DERIVED   built from the documents that NAME this term. Nobody types into
 *             them. They cannot go stale, because adding a document that names
 *             the term is what puts it on the page.
 *   FEATURED  three to five, hand-picked on the term itself.
 *
 * A term cannot know its future instances; an instance knows its concept when it
 * is created. That is why the link lives on the instance and these lists are read
 * backwards rather than stored here.
 */

/**
 * Packaging that is reachable by a customer.
 *
 * ⚠️ Keep aligned with `LINE_STYLE_ACTIVE` / `ORDERABLE_STATUS` in
 * `status-gates.ts`. The `!defined` arm is NOT optional: unset reads as active
 * for lines, styles and products, and production lines still carry no status.
 * `status == "active"` alone would silently drop them.
 */
const PACKAGING_VISIBLE = /* groq */ `(!defined(status) || status == "active")`;

/** Options a customer can meet — Active only, per PROD-2733's two-value status. */
const OPTION_VISIBLE = /* groq */ `status == "active"`;

/**
 * One card for a Line, a Style or a Product.
 *
 * The three render identically — the card carries what kind of thing it is in
 * `_type`, so the page needs no heading per level and shows one flat list.
 *
 * ⚠️ `imageUrl` is null for every Line and Style today: 1,225 products carry
 * `images`, and **0 lines and 0 styles do**. The field exists on all three
 * (`catalogMediaFields`), so this is a content gap, not a wrong path — but a
 * Line or Style card has no picture until someone fills it, and the render
 * needs to look right without one.
 */
const PACKAGING_CARD = /* groq */ `{
  _id,
  _type,
  title,
  "slug": slug.current,
  shortDescription,
  "imageUrl": coalesce(images[primary == true][0].asset->url, images[0].asset->url),
  "imageAlt": coalesce(images[primary == true][0].alt, images[0].alt, title)
}`;

/**
 * Everything that names this term as its concept, at any level.
 *
 * Matches on `glossaryTerm[]._ref` rather than `references()` so that a future
 * field pointing at a Glossary Term from one of these types cannot quietly widen
 * the block — only an explicit concept link belongs here.
 *
 * 🔴 Authoring keeps this list from doubling up: a concept is tagged at the
 * highest level where it is true of everything below, so a style and its products
 * never both carry it. `conceptNotAlreadyOnParent` in the Studio warns when they
 * do, but this query does not de-duplicate — a warning that gets ignored should
 * be visible, not silently patched over.
 */
const AVAILABLE_AS_PACKAGING = /* groq */ `*[
  _type in ["productLine", "productStyle", "product"] &&
  ^._id in glossaryTerm[]._ref &&
  ${PACKAGING_VISIBLE}
] | order(_type asc, title asc) ${PACKAGING_CARD}`;

/** The same shape for customization options, which have had the link since PROD-3206. */
const AVAILABLE_AS_CUSTOMIZATION = /* groq */ `*[
  _type == "customizationOption" &&
  ^._id in glossaryTerm[]._ref &&
  ${OPTION_VISIBLE}
] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  "imageUrl": coalesce(images[primary == true][0].asset->url, images[0].asset->url)
}`;

/** Posts that explain this term. Derived, so the block never goes stale. */
const READ_NEXT = /* groq */ `*[
  _type == "post" &&
  ^._id in explains[]._ref
] | order(publishedAt desc) [0...6] {
  _id,
  title,
  "slug": slug.current
}`;

/**
 * Related terms, as the UNION of both directions — tagging either side is enough,
 * so an editor never has to remember which page they were on.
 */
const RELATED_TERMS = /* groq */ `*[
  _type == "glossaryTerm" &&
  _id != ^._id &&
  (_id in ^.relatedTerms[]._ref || ^._id in relatedTerms[]._ref)
] | order(term asc) {
  _id,
  term,
  "slug": slug.current
}`;

/** The whole term page. */
export const GLOSSARY_TERM_QUERY = /* groq */ `*[
  _type == "glossaryTerm" &&
  slug.current == $slug
][0]{
  _id,
  term,
  "slug": slug.current,
  alsoKnownAs,
  definition,
  body,
  "group": group->title,

  "availableAsPackaging": ${AVAILABLE_AS_PACKAGING},
  "availableAsCustomization": ${AVAILABLE_AS_CUSTOMIZATION},
  "readNext": ${READ_NEXT},

  "featuredPackaging": featuredPackaging[]-> ${PACKAGING_CARD},
  "featuredSolutions": featuredSolutions[]->{ _id, _type, "title": coalesce(title, internalTitle), "slug": slug.current },
  "featuredExpertise": featuredExpertise[]->{ _id, title, "slug": slug.current },
  "relatedTerms": ${RELATED_TERMS},

  metaTitle,
  metaDescription
}`;

/** Every term that could have a page, for the index and for static params. */
export const GLOSSARY_TERM_SLUGS_QUERY = /* groq */ `*[
  _type == "glossaryTerm" &&
  defined(slug.current)
].slug.current`;
