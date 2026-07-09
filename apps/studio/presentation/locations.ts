import { defineLocations } from 'sanity/presentation'
import type { DocumentLocationResolvers } from 'sanity/presentation'
import {
  isBlogHomeSingleton,
  isBlogNotFoundSingleton,
  isBlogSearchSingleton,
  isBlogTopicsSingleton,
} from '../lib/blog-page-singletons'

/**
 * Document → front-end location resolvers for the Presentation tool.
 *
 * Per-workspace Presentation (decided 2026-06-08): the **Website** workspace
 * previews against `apps/www`, the **Blog** workspace against `apps/blog`. Each
 * resolver returns paths *relative to that workspace's* `previewUrl.origin`
 * (configured in sanity.config.ts), so editing a document shows it live in the
 * surface that renders it.
 *
 * A single Presentation pane drives one origin's visual-editing channel, which is
 * why the resolvers are split by surface rather than combined.
 */

// ── Blog surface (apps/blog) ─────────────────────────────────────────────────
// Blog posts route flat at /{slug}; landing pages at /{slug}; home at /.
export const blogLocations: DocumentLocationResolvers = {
  post: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? { locations: [{ title: doc.title || 'Untitled post', href: `/${doc.slug}` }] }
        : { locations: [] },
  }),
  blogPage: defineLocations({
    select: {
      _id: '_id',
      title: 'title',
      slug: 'slug.current',
      pageRole: 'pageRole',
    },
    resolve: (doc) => {
      if (isBlogHomeSingleton(doc ?? undefined)) {
        return { locations: [{ title: doc?.title || 'Homepage', href: '/' }] }
      }
      if (isBlogTopicsSingleton(doc ?? undefined)) {
        return {
          locations: [
            { title: doc?.title || 'Explore topics', href: '/topics' },
          ],
        }
      }
      if (isBlogNotFoundSingleton(doc ?? undefined)) {
        return {
          locations: [{ title: '404 page', href: '/404-preview' }],
        }
      }
      if (isBlogSearchSingleton(doc ?? undefined)) {
        return {
          locations: [{ title: doc?.title || 'Search page', href: '/search' }],
        }
      }
      return doc?.slug
        ? { locations: [{ title: doc.title || 'Page', href: `/${doc.slug}` }] }
        : { locations: [] }
    },
  }),
  blogCategory: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? { locations: [{ title: doc.title || 'Category', href: `/${doc.slug}` }] }
        : { locations: [] },
  }),
  blogTag: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? { locations: [{ title: doc.title || 'Topic', href: `/topics/${doc.slug}` }] }
        : { locations: [] },
  }),
  author: defineLocations({
    select: { title: 'name', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? { locations: [{ title: doc.title || 'Author', href: `/author/${doc.slug}` }] }
        : { locations: [] },
  }),
}

// ── Website surface (apps/www) ───────────────────────────────────────────────
// ⚠️ Schema/routing drift (flagged 2026-06-08): apps/www builds the product PDP
// URL from `handle` + `primaryCollection->slug` + `primaryLandingPage->slug`
// (packages/sanity PRODUCT_PATHS_QUERY / PRODUCT_BY_PATH_QUERY). The `product`
// schema on this branch instead defines `slug` + `productCategories` +
// `productStyleCategories` and has no `handle`/`primaryCollection`/
// `primaryLandingPage` — so product preview can't be reliable until the product
// model is reconciled (see raw/projects/platform-evolution/studio-schema-ux-spec.md).
//
// This resolver targets the *routing truth* and guards every field, so it
// produces no location while those fields are absent and lights up automatically
// once the product model lands. No-op today, correct tomorrow.
export const websiteLocations: DocumentLocationResolvers = {
  product: defineLocations({
    select: {
      title: 'title',
      handle: 'handle.current',
      collectionSlug: 'primaryCollection->slug.current',
      pageSlug: 'primaryLandingPage->slug.current',
    },
    resolve: (doc) =>
      doc?.handle && doc?.collectionSlug && doc?.pageSlug
        ? {
            locations: [
              {
                title: doc.title || 'Product',
                href: `/products/${doc.pageSlug}/${doc.collectionSlug}/${doc.handle}`,
              },
            ],
          }
        : { locations: [] },
  }),
  // TODO(capability): apps/www routes capability detail via capabilityCategory
  // (CAPABILITY_BY_CATEGORY_AND_SLUG_QUERY), another schema/routing divergence.
  // Add a guarded resolver once the capability routing model is settled.
}
