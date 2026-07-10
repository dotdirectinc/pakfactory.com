/**
 * Document types editors may pick for footer (and future nav) internal links.
 * Each type must have a URL rule in `@pakfactory/sanity/resolve-document-href`.
 *
 * When adding a new routable singleton or document type:
 * 1. Add the `_type` here
 * 2. Implement path resolution in packages/sanity/src/resolve-document-href.ts
 */

export const LINKABLE_DOCUMENT_TYPES = [
  // Blog
  'post',
  'blogCategory',
  'blogTag',
  'author',
  'blogPage',
  // Website
  'page',
  'product',
  'solution',
  'caseStudy',
  'capabilityCategory',
  // Resources
  'guide',
  'glossaryTerm',
  'helpArticle',
  // Static singletons (fixed routes)
  'aboutPage',
  'contactPage',
  'privacyPolicy',
  'termsOfService',
] as const

export type LinkableDocumentType = (typeof LINKABLE_DOCUMENT_TYPES)[number]

export const linkableReferenceTo = LINKABLE_DOCUMENT_TYPES.map((type) => ({ type }))

/**
 * GROQ filter for the internal-link reference picker.
 * Excludes topics / search / 404 blogPage singletons (not good CTA targets).
 * Allows home, contribute, landing, and static blogPages.
 */
export const LINKABLE_TYPE_FILTER = `(_type in $types) && !(
  _type == "blogPage" && pageRole in $excludedBlogPageRoles
)`

export const linkableTypeFilterParams = {
  types: [...LINKABLE_DOCUMENT_TYPES],
  excludedBlogPageRoles: ['topics', 'search', 'notFound'],
}
