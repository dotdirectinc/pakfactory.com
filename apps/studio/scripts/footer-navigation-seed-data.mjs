/**
 * Default footer link columns for blogNavigation.footerNavigation.
 * Shared by seed-blog-dev.mjs and migrate-blog-navigation.mjs.
 */

const key = () => Math.random().toString(36).slice(2, 10)

const ref = (id) => ({ _type: 'reference', _ref: id, _key: id })

function internalLink(refId, label) {
  return {
    _key: key(),
    linkType: 'internal',
    internalLink: ref(refId),
    ...(label ? { label } : {}),
  }
}

function externalLink(url, label) {
  return {
    _key: key(),
    linkType: 'external',
    externalUrl: url,
    ...(label ? { label } : {}),
  }
}

function footerSection(title, links) {
  return {
    _key: key(),
    title,
    links,
  }
}

function footerColumn(sections) {
  return {
    _key: key(),
    sections,
  }
}

const CATEGORY_REFS = [
  { refId: 'bcat-packaging-news', label: 'Packaging News' },
  { refId: 'bcat-trends', label: 'Trends' },
  { refId: 'bcat-business-strategy', label: 'Business Strategy' },
  { refId: 'bcat-sustainability', label: 'Sustainability' },
  { refId: 'bcat-design-inspiration', label: 'Design Inspiration' },
]

/**
 * @param {string} [wwwBase] Marketing site origin (no trailing slash).
 * @param {string} [blogBase] Blog site origin for code routes like /contribute.
 * @returns {{ columns: object[] }}
 */
export function buildFooterNavigationSeed(
  wwwBase = 'https://www.pakfactory.com',
  blogBase = 'http://localhost:3003',
) {
  const www = (path) => `${wwwBase.replace(/\/$/, '')}${path}`
  const blog = (path) => `${blogBase.replace(/\/$/, '')}${path}`

  return {
    columns: [
      footerColumn([
        footerSection(
          'Browse the Blog',
          CATEGORY_REFS.map(({ refId, label }) => internalLink(refId, label)),
        ),
        footerSection('Explore PakFactory', [
          internalLink('aboutPage', 'About'),
          externalLink(www('/case-studies'), 'Case Studies'),
          externalLink(www('/resources'), 'Resources'),
          internalLink('contactPage', 'Get a Quote'),
          externalLink(blog('/contribute'), 'Contribute to the Blog'),
        ]),
      ]),
      footerColumn([
        footerSection('Capabilities', [
          externalLink(www('/capabilities'), 'Rigid Boxes'),
          externalLink(www('/capabilities'), 'Folding Cartons'),
          externalLink(www('/capabilities'), 'Custom Pouches'),
          externalLink(www('/capabilities'), 'Labels & Stickers'),
          externalLink(www('/capabilities'), 'View All'),
        ]),
      ]),
      footerColumn([
        footerSection('Our Services', [
          externalLink(www('/solutions'), 'Packaging Strategy'),
          externalLink(www('/solutions'), 'Packaging Design'),
          externalLink(www('/solutions'), 'Prototyping'),
          externalLink(www('/solutions'), 'Managed Manufacturing'),
          externalLink(www('/solutions'), 'Logistics'),
          externalLink(www('/solutions'), 'Packaging Fulfillment'),
          externalLink(www('/solutions'), 'View All'),
        ]),
      ]),
    ],
  }
}

const STATIC_SINGLETON_PATHS = {
  '/about': 'aboutPage',
  '/contact': 'contactPage',
  '/privacy': 'privacyPolicy',
  '/terms': 'termsOfService',
}

/**
 * Convert a legacy footer link ({ href, external, label }) to the reference-based shape.
 *
 * @param {object} link
 * @param {object} lookup
 * @param {string} wwwBase
 * @param {string} blogBase
 * @returns {object | null}
 */
export function convertLegacyFooterLink(link, lookup, wwwBase, blogBase) {
  if (link.linkType) {
    return link
  }

  const href = typeof link.href === 'string' ? link.href.trim() : ''
  if (!href) {
    console.warn('  ⚠  Skipping footer link with no href or linkType')
    return null
  }

  const label = link.label?.trim() || undefined
  const www = (path) => `${wwwBase.replace(/\/$/, '')}${path}`
  const blog = (path) => `${blogBase.replace(/\/$/, '')}${path}`

  if (link.external === true || /^https?:\/\//i.test(href)) {
    for (const [path, docId] of Object.entries(STATIC_SINGLETON_PATHS)) {
      if (href === www(path) || href.endsWith(path)) {
        return internalLink(docId, label)
      }
    }
    return externalLink(href, label)
  }

  if (href === '/contribute') {
    return externalLink(blog('/contribute'), label ?? 'Contribute to the Blog')
  }

  for (const [path, docId] of Object.entries(STATIC_SINGLETON_PATHS)) {
    if (href === path) return internalLink(docId, label)
  }

  const solutionsMatch = href.match(/^\/solutions\/([^/]+)$/)
  if (solutionsMatch) {
    const refId = lookup.solutionsBySlug.get(solutionsMatch[1])
    if (refId) return internalLink(refId, label)
  }

  const caseStudyMatch = href.match(/^\/case-studies\/([^/]+)$/)
  if (caseStudyMatch) {
    const refId = lookup.caseStudiesBySlug.get(caseStudyMatch[1])
    if (refId) return internalLink(refId, label)
  }

  const tagMatch = href.match(/^\/tag\/([^/]+)$/)
  if (tagMatch) {
    const refId = lookup.tagsBySlug.get(tagMatch[1])
    if (refId) return internalLink(refId, label)
  }

  const authorMatch = href.match(/^\/author\/([^/]+)$/)
  if (authorMatch) {
    const refId = lookup.authorsBySlug.get(authorMatch[1])
    if (refId) return internalLink(refId, label)
  }

  const slug = href.replace(/^\//, '')
  const categoryRef = lookup.categoriesBySlug.get(slug)
  if (categoryRef) return internalLink(categoryRef, label)

  const blogPageRef = lookup.blogPagesBySlug.get(slug)
  if (blogPageRef) return internalLink(blogPageRef, label)

  const postRef = lookup.postsBySlug.get(slug)
  if (postRef) return internalLink(postRef, label)

  const wwwPageRef = lookup.wwwPagesBySlug.get(slug)
  if (wwwPageRef) return internalLink(wwwPageRef, label)

  console.warn(`  ⚠  Could not map legacy footer href "${href}" — link dropped`)
  return null
}

/**
 * @param {object} footerNavigation
 * @param {object} lookup
 * @param {string} wwwBase
 * @param {string} blogBase
 * @returns {{ footerNavigation: object, migrated: boolean }}
 */
export function migrateLegacyFooterNavigation(
  footerNavigation,
  lookup,
  wwwBase,
  blogBase,
) {
  const columns = footerNavigation?.columns
  if (!Array.isArray(columns) || columns.length === 0) {
    return { footerNavigation, migrated: false }
  }

  let migrated = false

  const nextColumns = columns.map((column) => {
    if (!column?.sections) return column

    const nextSections = column.sections.map((section) => {
      if (!section?.links) return section

      const nextLinks = section.links
        .map((link) => {
          if (!link || link.linkType) return link
          migrated = true
          const converted = convertLegacyFooterLink(link, lookup, wwwBase, blogBase)
          return converted ? { ...converted, _key: link._key ?? key() } : null
        })
        .filter(Boolean)

      return { ...section, links: nextLinks }
    })

    return { ...column, sections: nextSections }
  })

  return {
    footerNavigation: { ...footerNavigation, columns: nextColumns },
    migrated,
  }
}

export function buildFooterLinkLookup(rows) {
  const bySlug = (items) => new Map(items.map((row) => [row.slug, row._id]))

  return {
    categoriesBySlug: bySlug(rows.categories ?? []),
    blogPagesBySlug: bySlug(rows.blogPages ?? []),
    wwwPagesBySlug: bySlug(rows.wwwPages ?? []),
    postsBySlug: bySlug(rows.posts ?? []),
    tagsBySlug: bySlug(rows.tags ?? []),
    authorsBySlug: bySlug(rows.authors ?? []),
    solutionsBySlug: bySlug(rows.solutions ?? []),
    caseStudiesBySlug: bySlug(rows.caseStudies ?? []),
  }
}

export function footerNavigationHasLegacyLinks(footerNavigation) {
  const columns = footerNavigation?.columns
  if (!Array.isArray(columns)) return false

  for (const column of columns) {
    for (const section of column?.sections ?? []) {
      for (const link of section?.links ?? []) {
        if (link?.href && !link?.linkType) return true
      }
    }
  }

  return false
}
