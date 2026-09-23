import { defineLocations } from 'sanity/presentation'
import type {
  DocumentLocationResolvers,
  DocumentLocationsState,
} from 'sanity/presentation'
import {
  isBlogContributeSingleton,
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

// ── Shared "no location" states ─────────────────────────────────────────────
// Defined up front because every resolver map below uses them. An explicit
// message always beats an empty list, which a Presentation pane renders as
// though it were still loading.

/**
 * A document that has no page on the site — by design, or not yet.
 * `tone: 'caution'` renders it as an explicit state in the Presentation pane
 * rather than an empty list, which reads as "still loading".
 */
const notOnSite = (message: string): DocumentLocationsState => ({
  locations: [],
  message,
  tone: 'caution',
})

/** A document whose route exists but renders a Coming Soon stub on the target. */
const reservedRoute = (path: string): DocumentLocationsState => ({
  locations: [],
  message: `${path} is reserved on the site but still renders a "coming soon" stub — nothing to preview yet.`,
  tone: 'caution',
})

/** Blog-surface document: real page, different origin, different pane. */
const onBlogSurface = (what: string): DocumentLocationsState => ({
  locations: [],
  message: `This ${what} is published on the blog — open it in the Blog workspace to preview it.`,
  tone: 'caution',
})

/** Per-type blog settings documents shape a listing; they are not a page. */
const blogSettings = (what: string): DocumentLocationsState => ({
  locations: [],
  message: `Settings for ${what} — they shape those pages rather than being one.`,
  tone: 'caution',
})

// ── Blog surface (apps/blog) ─────────────────────────────────────────────────
// Blog posts route flat at /{slug}; landing pages at /{slug}; home at /.
//
// Presentation resolves these hrefs against the preview ORIGIN only (it drops the
// `/blog` base path from `initial` when building location URLs), so in production
// every href must be prefixed with the basePath the blog is mounted under, or the
// iframe navigates to `origin/{slug}` (404) and "Documents on this page" never
// matches the app's real `/blog/...` pathname (PROD-2223). `basePath` is '' locally
// (no basePath) and '/blog' in prod — derived from the preview URL in sanity.config.
export const makeBlogLocations = (
  basePath: string,
): DocumentLocationResolvers => {
  // href('/') → basePath root ('/blog' or '/'); href('/x') → '/blog/x' or '/x'.
  const href = (path: string): string =>
    path === '/' ? basePath || '/' : `${basePath}${path}`
  return {
    post: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc) =>
        doc?.slug
          ? { locations: [{ title: doc.title || 'Untitled post', href: href(`/${doc.slug}`) }] }
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
          return { locations: [{ title: doc?.title || 'Homepage', href: href('/') }] }
        }
        if (isBlogTopicsSingleton(doc ?? undefined)) {
          return {
            locations: [
              { title: doc?.title || 'Explore topics', href: href('/topics') },
            ],
          }
        }
        if (isBlogNotFoundSingleton(doc ?? undefined)) {
          return {
            locations: [{ title: '404 page', href: href('/404-preview') }],
          }
        }
        if (isBlogSearchSingleton(doc ?? undefined)) {
          return {
            locations: [{ title: doc?.title || 'Search page', href: href('/search') }],
          }
        }
        if (isBlogContributeSingleton(doc ?? undefined)) {
          return {
            locations: [
              { title: doc?.title || 'Contribute page', href: href('/contribute') },
            ],
          }
        }
        return doc?.slug
          ? { locations: [{ title: doc.title || 'Page', href: href(`/${doc.slug}`) }] }
          : { locations: [] }
      },
    }),
    blogCategory: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc) =>
        doc?.slug
          ? { locations: [{ title: doc.title || 'Category', href: href(`/${doc.slug}`) }] }
          : { locations: [] },
    }),
    blogTag: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc) =>
        doc?.slug
          ? { locations: [{ title: doc.title || 'Topic', href: href(`/topics/${doc.slug}`) }] }
          : { locations: [] },
    }),
    author: defineLocations({
      select: { title: 'name', slug: 'slug.current' },
      resolve: (doc) =>
        doc?.slug
          ? { locations: [{ title: doc.title || 'Author', href: href(`/author/${doc.slug}`) }] }
          : { locations: [] },
    }),
  }
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
  caseStudy: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? { locations: [{ title: doc.title || 'Case Study', href: `/case-studies/${doc.slug}` }] }
        : { locations: [] },
  }),
  // Was keyed on `caseStudiesPage`, a schema type that no longer exists: the
  // listing was consolidated onto the shared `listingPage` type with a pinned
  // `_id` (PROD-2292), so this resolver never matched a document. Keyed on the
  // live type and discriminated by `_id`, which is how structure/index.ts
  // addresses it — `listingPage` has no slug field at all.
  listingPage: defineLocations({
    select: { _id: '_id', title: 'title' },
    resolve: (doc) => {
      const id = doc?._id?.replace(/^drafts\./, '')
      if (id === 'caseStudiesPage') {
        return {
          locations: [
            { title: doc?.title || 'Case Studies', href: '/case-studies' },
          ],
        }
      }
      if (id === 'expertisePage') {
        return {
          locations: [
            { title: doc?.title || 'Expertise', href: '/expertise' },
          ],
        }
      }
      return notOnSite(
        'Only Case Studies and Expertise listings are previewable from this workspace.',
      )
    },
  }),
  // Was selecting `handle` / `primaryCollection` / `primaryLandingPage` — all
  // removed from the schema in the content-model rebuild, so it produced no
  // location for any document. Products are not reachable under the
  // `/case-studies/` base this workspace previews, so the honest answer is a
  // message; the real product URLs live in `siteLocations` below, used by the
  // Products workspace.
  product: defineLocations({
    select: { title: 'title' },
    resolve: () =>
      notOnSite('Products are previewed from the Products workspace.'),
  }),
  // TODO(capability): apps/www routes capability detail via customizationCategory
  // (CAPABILITY_BY_CATEGORY_AND_SLUG_QUERY), another schema/routing divergence.
  // Add a guarded resolver once the capability routing model is settled.
}

// ── Website surface, whole site (apps/www at staging.pakfactory.com) ─────────
// PROD-2494. `websiteLocations` above drives the **Case Studies** workspace only,
// whose preview base is path-scoped to `/case-studies/` (nginx forwards nothing
// else at the apex). The seven remaining content workspaces preview the site
// ROOT, which is a different origin, so they get their own resolver map.
//
// ⚠️ Where these hrefs come from. They mirror `apps/www/src/lib/www-routes.ts` on
// **`www-new-release`** — the branch `staging.pakfactory.com` actually serves —
// verified against its route tree, not guessed:
//
//     /                              homePage
//     /products/{slug}               productLine OR product (ONE namespace)
//     /products/{line}/{style}       productStyle
//     /customizations                listing
//     /customizations/{cat}          customizationCategory
//     /customizations/{cat}/{handle} customizationOption, gated
//     /solutions/{slug}              solution, gated by hasPage
//     /solutions/{slug}/{styleSlug}  solutionStyle, gated by parent hasPage
//     /case-studies[/{slug}]         caseStudy
//
// This branch's `apps/www` does **not** contain those routes (it still has
// `/capabilities` and `/products/{pageSlug}/{collectionSlug}/{handle}`), which is
// why the table cannot simply import `www-routes.ts`. When `www-new-release`
// merges, replace this table with an import from it — one routing truth, not two.
//
// Every field is guarded. A resolver that cannot build a real URL returns a
// `message` instead of a plausible-looking href, because a Presentation pane that
// navigates to a 404 is worse than one that says why it cannot.

export const siteLocations: DocumentLocationResolvers = {
  // ── Types with a real, content-driven page ────────────────────────────────
  homePage: defineLocations({
    select: { title: 'title' },
    resolve: (doc) => ({
      locations: [{ title: doc?.title || 'Homepage', href: '/' }],
    }),
  }),

  productCatalogPage: defineLocations({
    select: { title: 'title' },
    resolve: (doc) => ({
      locations: [
        { title: doc?.title || 'Products', href: '/products' },
      ],
    }),
  }),

  customizationCatalogPage: defineLocations({
    select: { title: 'title' },
    resolve: (doc) => ({
      locations: [
        { title: doc?.title || 'Customizations', href: '/customizations' },
      ],
    }),
  }),

  // `/products/{slug}` resolves a LINE first, then a product
  // (`getByProductsSegment` in lib/catalog/catalog.ts). Both types therefore
  // share one namespace: a product whose slug equals a line's slug is
  // unreachable, and the line wins. Not ours to fix here — noted so the next
  // reader does not assume two separate routes.
  productLine: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? {
            locations: [
              { title: doc.title || 'Product line', href: `/products/${doc.slug}` },
            ],
          }
        : notOnSite('Add a slug to give this product line a URL.'),
  }),
  product: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? {
            locations: [
              { title: doc.title || 'Product', href: `/products/${doc.slug}` },
            ],
          }
        : notOnSite('Add a slug to give this product a URL.'),
  }),
  productStyle: defineLocations({
    select: {
      title: 'title',
      slug: 'slug.current',
      lineSlug: 'productLine->slug.current',
    },
    resolve: (doc) =>
      doc?.slug && doc?.lineSlug
        ? {
            locations: [
              {
                title: doc.title || 'Product style',
                href: `/products/${doc.lineSlug}/${doc.slug}`,
              },
            ],
          }
        : notOnSite(
            'A style is reachable only under its parent line — both need a slug.',
          ),
  }),

  customizationCategory: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? {
            locations: [
              {
                title: doc.title || 'Customization category',
                href: `/customizations/${doc.slug}`,
              },
            ],
          }
        : notOnSite('Add a slug to give this category a URL.'),
  }),
  // The site query is gated, not just slugged:
  //   _type == "customizationOption" && hasPage == true && status == "active"
  //   && slug.current == $handle && type->category->slug.current == $category
  // so the resolver reproduces every condition. An option failing any of them
  // has no page, and saying which condition failed is the whole point.
  customizationOption: defineLocations({
    select: {
      title: 'title',
      slug: 'slug.current',
      hasPage: 'hasPage',
      status: 'status',
      categorySlug: 'type->category->slug.current',
    },
    resolve: (doc) => {
      if (!doc?.hasPage) {
        return notOnSite(
          'This option has no page of its own — "Has page" is off, so it appears only inside its type.',
        )
      }
      if (doc.status !== 'active') {
        return notOnSite(
          `Only active options are published; this one is "${doc.status || 'unset'}".`,
        )
      }
      if (!doc.slug || !doc.categorySlug) {
        return notOnSite(
          'Needs its own slug and a slug on the parent type’s category.',
        )
      }
      return {
        locations: [
          {
            title: doc.title || 'Customization',
            href: `/customizations/${doc.categorySlug}/${doc.slug}`,
          },
        ],
      }
    },
  }),

  solution: defineLocations({
    select: { title: 'title', slug: 'slug.current', hasPage: 'hasPage' },
    resolve: (doc) => {
      if (!doc?.hasPage) {
        return notOnSite(
          'This solution has no page — turn on "Has page" to publish one.',
        )
      }
      return doc.slug
        ? {
            locations: [
              { title: doc.title || 'Solution', href: `/solutions/${doc.slug}` },
            ],
          }
        : notOnSite('Add a slug to give this solution a URL.')
    },
  }),
  // Solution Style catalogue at `/solutions/{solution}/{style}` (PROD-2520 FE).
  // Parent `hasPage` is enforced on the site; Presentation still shows the URL
  // so editors can open the intended path while drafting.
  solutionStyle: defineLocations({
    select: {
      title: 'title',
      slug: 'slug.current',
      solutionSlug: 'solution->slug.current',
    },
    resolve: (doc) =>
      doc?.slug && doc?.solutionSlug
        ? {
            locations: [
              {
                title: doc.title || 'Solution style',
                href: `/solutions/${doc.solutionSlug}/${doc.slug}`,
              },
            ],
          }
        : notOnSite(
            'A style is reachable only under its parent solution — both need a slug.',
          ),
  }),

  caseStudy: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? {
            locations: [
              {
                title: doc.title || 'Case study',
                href: `/case-studies/${doc.slug}`,
              },
              { title: 'All case studies', href: '/case-studies' },
            ],
          }
        : notOnSite('Add a slug to give this case study a URL.'),
  }),
  // Listing pages are pinned singletons addressed by _id, not by slug — the
  // schema has no slug field at all.
  listingPage: defineLocations({
    select: { _id: '_id', title: 'title' },
    resolve: (doc) => {
      const id = doc?._id?.replace(/^drafts\./, '')
      if (id === 'caseStudiesPage') {
        return {
          locations: [
            { title: doc?.title || 'Case studies', href: '/case-studies' },
          ],
        }
      }
      if (id === 'expertisePage') {
        return {
          locations: [
            { title: doc?.title || 'Expertise', href: '/expertise' },
          ],
        }
      }
      return notOnSite(
        'Only Case Studies and Expertise listings have pages on the site today.',
      )
    },
  }),

  // ── Routes that exist but render a stub on the target ─────────────────────
  bundle: defineLocations({
    select: { slug: 'slug.current' },
    resolve: () => reservedRoute('/bundles/{slug}'),
  }),
  legalPage: defineLocations({
    select: { title: 'title' },
    resolve: () => reservedRoute('/policies/{slug}'),
  }),
  expertiseStage: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? {
            locations: [
              {
                title: doc.title || 'Expertise stage',
                href: `/expertise/${doc.slug}`,
              },
              { title: 'All expertise', href: '/expertise' },
            ],
          }
        : notOnSite('Add a slug to give this stage a URL.'),
  }),
  expertiseService: defineLocations({
    select: { title: 'title' },
    resolve: () => reservedRoute('/expertise'),
  }),

  // ── No public URL: content that renders inside another document ───────────
  customizationType: defineLocations({
    select: { title: 'title' },
    resolve: () =>
      notOnSite(
        'Types have no page — they group options inside a category page.',
      ),
  }),
  property: defineLocations({
    select: { title: 'title' },
    resolve: () =>
      notOnSite('Taxonomy. Properties surface as filters and specs, not pages.'),
  }),
  propertyValue: defineLocations({
    select: { title: 'title' },
    resolve: () =>
      notOnSite('Taxonomy. Values surface as filters and specs, not pages.'),
  }),
  client: defineLocations({
    select: { name: 'name' },
    resolve: () => notOnSite('Clients appear on the case studies that cite them.'),
  }),
  contentWidget: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Embedded in the documents that reference it.'),
  }),

  // ── No public URL on the site: routes not built ───────────────────────────
  faq: defineLocations({
    select: { title: 'question' },
    resolve: () => notOnSite('Resources routes are not built on the site yet.'),
  }),
  guide: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Resources routes are not built on the site yet.'),
  }),
  dieline: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Resources routes are not built on the site yet.'),
  }),
  glossaryTerm: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Resources routes are not built on the site yet.'),
  }),
  helpCategory: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Resources routes are not built on the site yet.'),
  }),
  contentPage: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: () =>
      notOnSite(
        'The site has no catch-all page route; /about and /contact are stubs.',
      ),
  }),
  videoPost: defineLocations({
    select: { title: 'title' },
    resolve: () =>
      notOnSite('Videos render on the blog and in channel rails, not on www.'),
  }),

  // ── Configuration, never a page ───────────────────────────────────────────
  settings: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Global settings apply to every page; none is "it".'),
  }),
  websiteNavigation: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Navigation renders in the chrome of every page.'),
  }),
  redirect: defineLocations({
    select: { from: 'from' },
    resolve: () => notOnSite('A redirect has no page — it sends visitors to one.'),
  }),
  redirectGroup: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Grouping for redirects; not a page.'),
  }),
  // ── Blog surface: real pages, but not on this origin ──────────────────────
  // Every workspace registers the FULL schema, so a blog document can be opened
  // from any of the seven site workspaces. Its page lives on the blog origin,
  // which this Presentation pane does not drive (one pane, one origin), so the
  // honest answer is a pointer rather than a blank pane or a cross-origin href
  // the iframe would refuse.
  post: defineLocations({
    select: { title: 'title' },
    resolve: () => onBlogSurface('post'),
  }),
  blogPage: defineLocations({
    select: { title: 'title' },
    resolve: () => onBlogSurface('page'),
  }),
  blogCategory: defineLocations({
    select: { title: 'title' },
    resolve: () => onBlogSurface('category'),
  }),
  blogTag: defineLocations({
    select: { title: 'title' },
    resolve: () => onBlogSurface('topic'),
  }),
  blogTopicGroup: defineLocations({
    select: { title: 'title' },
    resolve: () =>
      notOnSite(
        'Topic groups order the blog\u2019s Explore page; they have no page of their own.',
      ),
  }),
  author: defineLocations({
    select: { name: 'name' },
    resolve: () => onBlogSurface('author'),
  }),
  blogNavigation: defineLocations({
    select: { title: 'title' },
    resolve: () => notOnSite('Blog navigation renders in the blog\u2019s chrome.'),
  }),

  // ── Per-type blog settings: configuration, never a page ───────────────────
  postSettings: defineLocations({
    select: { title: 'title' },
    resolve: () => blogSettings('posts'),
  }),
  categorySettings: defineLocations({
    select: { title: 'title' },
    resolve: () => blogSettings('categories'),
  }),
  topicSettings: defineLocations({
    select: { title: 'title' },
    resolve: () => blogSettings('topics'),
  }),
  authorSettings: defineLocations({
    select: { title: 'title' },
    resolve: () => blogSettings('author pages'),
  }),
  pageSettings: defineLocations({
    select: { title: 'title' },
    resolve: () => blogSettings('blog pages'),
  }),

  // `page` is the retiring legacy type (deletion tracked in Cleanup) — it is
  // deliberately filed in no workspace, and has no route.
  page: defineLocations({
    select: { title: 'title' },
    resolve: () =>
      notOnSite('Legacy type, being retired. Its documents are not rendered.'),
  }),
}

// ── Per-workspace composition ────────────────────────────────────────────────
// Every workspace registers the FULL schema (a deliberate decision — see the
// workspace comment in sanity.config.ts), so any document can be opened from
// any workspace. Presentation then asks for its location, and a type the
// workspace has no resolver for produced an empty pane.
//
// The fallback is a MESSAGE, never a borrowed href. It would be easy to spread
// `siteLocations` into the other two maps, and it would be wrong: those tools
// preview path-scoped bases (`/blog/`, `/case-studies/`) while Presentation
// resolves location hrefs against the ORIGIN, so a `/products/…` href offered
// from the Case Studies workspace would send the editor to the apex — which is
// Magento, and 404s. A pane that explains beats a link that lies.

/** Types with no resolver in `native` get an explicit cross-workspace note. */
const withCrossWorkspaceFallback = (
  native: DocumentLocationResolvers,
  note: string,
): DocumentLocationResolvers => {
  const fallback: DocumentLocationResolvers = {}
  // `siteLocations` is the full registry — every document type in the schema has
  // an entry there, so its keys are the list to cover.
  for (const type of Object.keys(siteLocations)) {
    if (native[type]) continue
    fallback[type] = defineLocations({
      select: { title: 'title' },
      resolve: () => notOnSite(note),
    })
  }
  return { ...fallback, ...native }
}

/** Blog workspace: blog documents resolve; everything else says where to go. */
export const makeBlogWorkspaceLocations = (
  basePath: string,
): DocumentLocationResolvers =>
  withCrossWorkspaceFallback(
    makeBlogLocations(basePath),
    'This type is not previewed from the Blog workspace — open it in the workspace that owns it.',
  )

/** Case Studies workspace: case studies + the pinned listing; rest explained. */
export const caseStudiesWorkspaceLocations: DocumentLocationResolvers =
  withCrossWorkspaceFallback(
    websiteLocations,
    'This type is not previewed from the Case Studies workspace — open it in the workspace that owns it.',
  )
