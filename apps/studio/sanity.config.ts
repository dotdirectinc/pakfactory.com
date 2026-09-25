import { defineConfig } from 'sanity'
import type { DocumentActionComponent, DocumentActionsContext, Template } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { visionTool } from '@sanity/vision'
import { colorInput } from '@sanity/color-input'
import { media } from 'sanity-plugin-media'
import {
  documentInternationalization,
  useDeleteTranslationAction,
  useDuplicateWithTranslationsAction,
} from '@sanity/document-internationalization'
import {
  siteLocations,
  makeBlogWorkspaceLocations,
  caseStudiesWorkspaceLocations,
} from './presentation/locations'
import { schemaTypes } from './schemas'
import { publishWithRedirect } from './actions/publishWithRedirect'
import { publishCaseStudy } from './actions/publishCaseStudy'
import { publishTopicGroupToTopicsPage } from './actions/publishTopicGroupToTopicsPage'
import { BLOG_I18N_SCHEMA_TYPES, SUPPORTED_LANGUAGES } from './lib/languages'
import { CHANNELS } from './lib/channels'
import {
  blogStructure,
  caseStudiesStructure,
  productsStructure,
  customizationStructure,
  solutionsWorkspaceStructure,
  expertiseStructure,
  resourcesWorkspaceStructure,
  mainWebsiteStructure,
  globalStructure,
} from './structure'
import { BlogCategoryPostsView } from './components/BlogCategoryPostsView'
import { RelatedPostsView } from './components/RelatedPostsView'
import { RelatedPostsByTagView } from './components/RelatedPostsByTagView'
import { RelatedPostsByAuthorView } from './components/RelatedPostsByAuthorView'
import { ProductStyleCategoryProductsView } from './components/ProductStyleCategoryProductsView'
import { ProductAvailableCustomizationsView } from './components/ProductAvailableCustomizationsView'
import { ProductInspirationView } from './components/productViews'
import { SolutionStyleMatchesView } from './components/SolutionStyleMatchesView'
import { SolutionStylesView } from './components/SolutionStylesView'
import {
  CustomizationCategoryTypesView,
  CustomizationOptionUsedByView,
  CustomizationTypeOptionsView,
  PropertyValueUsedByView,
  PropertyValuesView,
} from './components/customizationViews'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const datasetSuffix = dataset !== 'production' ? ` [${dataset.toUpperCase()}]` : ''

// ── Presentation (live site preview) ─────────────────────────────────────────
// Per-workspace: the Website workspace previews apps/www, Blog previews apps/blog.
// Origins are env-overridable (set in the Studio env, exposed via SANITY_STUDIO_*).
// Each surface must run @sanity/visual-editing + a draft-mode enable route for the
// overlays to work.
//
// WWW preview BASE — full URL carrying the `/case-studies/` path with a trailing
// slash. Previews go through the APEX (pakfactory.com), NOT the Vercel origin: the
// origin now 307-redirects direct hits to the apex (PROD-2207), which would bounce
// the Presentation iframe off `allowOrigins`. The apex is served by nginx (trusted
// proxy — no redirect). nginx only forwards `/case-studies*` to the www app, so BOTH
// the case-study content AND the draft-mode enable route must live under
// `/case-studies` — the route was moved to `case-studies/api/draft-mode/enable` and
// the relative `enable` below resolves under this base. PROD-2223.
const WWW_PREVIEW_RAW =
  process.env.SANITY_STUDIO_PREVIEW_URL_WWW || 'http://localhost:3003/case-studies/'
const WWW_PREVIEW_BASE = WWW_PREVIEW_RAW.endsWith('/')
  ? WWW_PREVIEW_RAW
  : `${WWW_PREVIEW_RAW}/`

// Blog preview BASE — a full URL that may carry a path (the `/blog` basePath in
// prod). Presentation resolves the draft-mode enable path and location hrefs
// against this, so it MUST end in a trailing slash: a relative `enable`
// ('api/draft-mode/enable') only appends under the base path when the base ends
// in '/' (PROD-2223). Prod → 'https://pakfactory.com/blog/' (the apex, served by
// nginx — the origin.blog host now 307-redirects direct hits to the apex),
// local → 'http://localhost:3004/'.
const BLOG_PREVIEW_RAW =
  process.env.SANITY_STUDIO_PREVIEW_URL_BLOG || 'http://localhost:3004/'
const BLOG_PREVIEW_BASE = BLOG_PREVIEW_RAW.endsWith('/')
  ? BLOG_PREVIEW_RAW
  : `${BLOG_PREVIEW_RAW}/`
// SITE preview BASE — the www app at its ROOT, for the seven content workspaces
// whose documents live outside /case-studies and /blog (PROD-2494). This is a
// DIFFERENT surface from WWW_PREVIEW_BASE above: that one is path-scoped to
// `/case-studies/` because nginx forwards only that prefix at the apex, and the
// product / solution / customization routes are not reachable there at all.
//
// Today the only wired target is `staging.pakfactory.com`, which serves those
// routes and reads the **development** dataset (verified: its asset URLs are
// cdn.sanity.io/files/8293wrxp/development/...), so it pairs with the staging
// Studio. The production Studio has no site target until those workspaces are
// released — see the release switch below and TARGETS in
// scripts/sanity/studio-targets.mjs.
//
// Env-driven, with no fallback (PROD-2494 AC: "no hard-coded host"). Trailing
// slash required, as for the other two bases.
// Presence of this variable is the RELEASE SWITCH for the seven site-root
// workspaces. No fallback on purpose: when it is unset, those workspaces get no
// Presentation tab at all.
//
// Why availability follows configuration rather than a dataset check: the
// site-root surfaces are unreleased, and their routes exist only on staging. QA
// previews them from the staging Studio, where Studio and site share the
// `development` dataset. A production-dataset Studio cannot preview them — the
// preview secret is a document in the Studio's OWN dataset, so it fails with
// "Invalid secret" (verified 2026-09-17). Wiring the target is therefore the
// same act as releasing the surface: set SITE for the prod target in
// scripts/sanity/studio-targets.mjs and the tab appears.
//
// Local dev: `pnpm studio:local` writes it into apps/studio/.env.local.
const SITE_PREVIEW_RAW = process.env.SANITY_STUDIO_PREVIEW_URL_SITE
const SITE_PREVIEW_BASE = !SITE_PREVIEW_RAW
  ? ''
  : SITE_PREVIEW_RAW.endsWith('/')
    ? SITE_PREVIEW_RAW
    : `${SITE_PREVIEW_RAW}/`
// Derived from the wired target rather than hardcoded: one fewer place to edit
// at release, and an unwired Studio carries no stray origin. Local dev keeps
// :3003 (apps/www's dev port) so `pnpm studio:local` works without extra setup.
const SITE_ALLOW_ORIGINS = SITE_PREVIEW_BASE
  ? [new URL(SITE_PREVIEW_BASE).origin, 'http://localhost:3003']
  : []

// Path the www app's case-study surface is mounted under on this origin
// ('/case-studies' everywhere today; '' if it ever moves to an origin root).
// Used to build the draft-mode enable path — see the note on `previewMode` below.
const WWW_BASE_PATH = (() => {
  try {
    return new URL(WWW_PREVIEW_BASE).pathname.replace(/\/+$/, '')
  } catch {
    return ''
  }
})()

// basePath the blog app is mounted under on this origin ('/blog' in prod, '' local).
// Location hrefs are resolved against the ORIGIN only (Presentation drops the base
// path when building them), so they must be prefixed with this — see locations.ts.
const BLOG_BASE_PATH = (() => {
  try {
    return new URL(BLOG_PREVIEW_BASE).pathname.replace(/\/+$/, '')
  } catch {
    return ''
  }
})()

const productTemplates: Template[] = [
  {
    id: 'product-standard',
    title: 'Product (Standard)',
    schemaType: 'product',
    parameters: [
      { name: 'categoryId', title: 'Category ID', type: 'string' },
      { name: 'styleId', title: 'Style ID', type: 'string' },
    ],
    value: ({ categoryId, styleId }: { categoryId: string; styleId: string }) => ({
      kind: 'standard',
      productLine: { _type: 'reference', _ref: categoryId },
      productStyle: [{ _type: 'reference', _ref: styleId }],
    }),
  },
  // The 'product-industry' template was removed in PROD-2284: it pre-filled the
  // retired `industries` / `industryCategories` reference arrays. Industry-typed
  // products now tag via Solutions.
  //
  // Unparameterised, unlike `product-standard` above, because the Solutions
  // workspace's Inspiration Products list needs a plain `+` (PROD-2547). That list
  // filters on `kind == "inspiration"` while the schema's initialValue is
  // 'standard', so without this the create button would make a document that
  // vanishes from the list it was created in. Being unparameterised also puts it
  // in the global + menu as "Product (Inspiration)", which is wanted.
  {
    id: 'product-inspiration',
    title: 'Product (Inspiration)',
    schemaType: 'product',
    value: { kind: 'inspiration' },
  },
]

const defaultDocumentNode = (S: any, { schemaType }: { schemaType: string }) => {
  if (schemaType === 'blogCategory') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(BlogCategoryPostsView).title('Posts'),
    ])
  }
  if (schemaType === 'blogTag') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(RelatedPostsByTagView).title('Related Posts'),
    ])
  }
  if (schemaType === 'author') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(RelatedPostsByAuthorView).title('Related Posts'),
    ])
  }
  if (schemaType === 'productStyle') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(ProductStyleCategoryProductsView).title('Products'),
    ])
  }
  // `basedOn` points from an inspiration product to the standard it was built
  // from, and PROD-2547 put the two kinds in different workspaces whose lists do
  // not show each other's rows — so neither end of that relationship is reachable
  // from the other without this tab.
  if (schemaType === 'product') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(ProductAvailableCustomizationsView).title('Customization'),
      S.view.component(ProductInspirationView).title('Inspiration'),
    ])
  }
  // Solution Styles are listed flat in the Solutions workspace, so this tab is
  // the only place a solution's own collections appear together — with the match
  // count that says which of them would publish empty.
  if (schemaType === 'solution') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(SolutionStylesView).title('Solution Styles'),
    ])
  }
  // Not a nicety. A Solution Style is a stored filter, and a stored filter can
  // resolve to zero with the form still valid — this tab is the only thing that
  // says so before the page publishes empty.
  if (schemaType === 'solutionStyle') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(SolutionStyleMatchesView).title('Matching products'),
    ])
  }
  // Customization and Property trees — the reference that makes each of these
  // relationships lives on the OTHER document, so the form cannot show any of
  // them. See `createReferencedByView`.
  if (schemaType === 'customizationCategory') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(CustomizationCategoryTypesView).title('Types'),
    ])
  }
  if (schemaType === 'customizationType') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(CustomizationTypeOptionsView).title('Options'),
    ])
  }
  if (schemaType === 'customizationOption') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(CustomizationOptionUsedByView).title('Used by'),
    ])
  }
  if (schemaType === 'property') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(PropertyValuesView).title('Values'),
    ])
  }
  if (schemaType === 'propertyValue') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(PropertyValueUsedByView).title('Used by'),
    ])
  }
  return S.document().views([S.view.form()])
}

const blogTemplates: Template[] = [
  {
    id: 'blogTag-in-group',
    title: 'Topic',
    schemaType: 'blogTag',
    parameters: [{ name: 'groupId', type: 'string' }],
    value: ({ groupId }: { groupId: string }) => ({
      topicGroup: { _type: 'reference', _ref: groupId },
    }),
  },
  // Creating a redirect from inside a group folder presets that group.
  {
    id: 'redirect-in-group',
    title: 'Redirect',
    schemaType: 'redirect',
    parameters: [{ name: 'groupId', type: 'string' }],
    value: ({ groupId }: { groupId: string }) => ({
      group: { _type: 'reference', _ref: groupId },
    }),
  },
]

// One create-template per channel so "New Video" can be preset to a surface.
const videoTemplates: Template[] = CHANNELS.map((c) => ({
  id: `videoPost-${c.id}`,
  title: `Video (${c.title})`,
  schemaType: 'videoPost',
  value: { channels: [c.id] },
}))

const schema = {
  types: schemaTypes,
  // Drop default + parameterized create templates for blog i18n types so Studio
  // only offers language templates (e.g. post-en → "English Post"). With EN-only
  // dormant i18n that leaves a single option → + creates immediately (no Post /
  // English Post chooser). Plugin docs: remove default new document template.
  templates: (prev: Template[]) => {
    const i18nIds = new Set<string>(BLOG_I18N_SCHEMA_TYPES)
    const withoutDefaults = prev.filter(
      (t) =>
        !i18nIds.has(t.id) &&
        !BLOG_I18N_SCHEMA_TYPES.some((type) => t.id === `${type}-parameterized`),
    )
    return [
      ...withoutDefaults,
      ...productTemplates,
      ...blogTemplates,
      ...videoTemplates,
    ]
  },
}

const blogI18nPlugin = documentInternationalization({
  supportedLanguages: [...SUPPORTED_LANGUAGES],
  schemaTypes: [...BLOG_I18N_SCHEMA_TYPES],
  languageField: 'language',
  allowCreateMetaDoc: true,
})

function isBlogI18nSchemaType(schemaType: string): boolean {
  return (BLOG_I18N_SCHEMA_TYPES as readonly string[]).includes(schemaType)
}

/** Remove native Schedule (Scheduled drafts) from the document action menu. */
function isSchedulePublishAction(action: DocumentActionComponent): boolean {
  return (
    action.displayName === 'SchedulePublishAction' ||
    action.action === 'schedule'
  )
}

// Replace the default publish action on posts so slug changes auto-create redirects.
// PROD-2228: Schedule / Scheduled drafts are off until Content Releases is on the
// plan — editors soft-schedule via future Publish date + Publish (stamped by
// ensure-published-at). Do not enable deprecated `scheduledPublishing`.
const documentActions = (
  prev: DocumentActionComponent[],
  context: DocumentActionsContext,
): DocumentActionComponent[] => {
  let actions = prev.filter((action) => !isSchedulePublishAction(action))

  if (context.schemaType === 'post') {
    actions = actions.map((action) =>
      action.action === 'publish' ? publishWithRedirect : action,
    )
  }
  if (context.schemaType === 'blogTopicGroup') {
    actions = actions.map((action) =>
      action.action === 'publish' ? publishTopicGroupToTopicsPage : action,
    )
  }
  if (context.schemaType === 'caseStudy') {
    actions = actions.map((action) =>
      action.action === 'publish' ? publishCaseStudy : action,
    )
  }

  if (isBlogI18nSchemaType(context.schemaType)) {
    actions = [
      ...actions,
      useDeleteTranslationAction as DocumentActionComponent,
      useDuplicateWithTranslationsAction as DocumentActionComponent,
    ]
  }

  return actions
}

// Per-workspace "create new" options. In a channel lens, video creation is
// preset to that channel (only its `videoPost-<channel>` template is offered);
// Global (channel = null) offers all templates so the author picks channels.
const makeNewDocumentOptions =
  (channel: string | null) =>
  (
    prev: { templateId: string }[],
    { creationContext }: { creationContext: { type: string } },
  ) => {
    if (creationContext.type !== 'structure') return prev
    // Singleton / pinned-ID page types are not creatable from "create new"
    // (§3.2) — they are reached only through their structure entries. contentPage
    // stays creatable (new company pages). PROD-2292.
    const NON_CREATABLE = new Set([
      'blogCategory',
      'homePage',
      'listingPage',
      'legalPage',
      'websiteNavigation',
      'solutionIndustryPage',
      'productLinePage',
      'productCatalogPage',
      'productStylePage',
      'customizationCatalogPage',
    ])
    let opts = prev.filter((item) => !NON_CREATABLE.has(item.templateId))
    if (channel) {
      // keep only this channel's video template; drop the bare + other channels'
      opts = opts.filter(
        (item) =>
          !item.templateId.startsWith('videoPost') ||
          item.templateId === `videoPost-${channel}`,
      )
    }
    return opts
  }

// PROD-2228: Content Releases is paywalled; Scheduled drafts (Schedule) depends
// on the same release machinery and left broken UX without Growth+. Hide both
// until Releases is unlocked. Editors use soft-schedule (future Publish date +
// Publish) instead.
const releasesAndScheduleDisabled = {
  releases: { enabled: false as const },
  scheduledDrafts: { enabled: false as const },
}

// Presentation for the seven content workspaces (PROD-2494). One factory rather
// than seven copies: every workspace previews the same origin with the same
// resolver map, and the only thing that varies is which documents you arrive
// from. `enable` is RELATIVE so it resolves under the base path, matching the
// blog and case-studies tools above.
const sitePresentation = () =>
  presentationTool({
    name: 'presentation',
    title: 'Presentation',
    previewUrl: {
      initial: SITE_PREVIEW_BASE,
// ABSOLUTE, with a leading slash — and that slash is the whole fix.
      //
      // Presentation resolves a RELATIVE `enable` against the iframe's CURRENT
      // pathname, not against `initial`. From /products/custom-book-style-…,
      // `new URL('api/draft-mode/enable', …)` drops the last segment and yields
      // **/products/api/draft-mode/enable**, which 404s. The iframe then renders
      // that 404 page, draft mode never engages, and Presentation reports
      // "Unable to connect to visual editing" with "No matching documents" —
      // three symptoms, one missing slash. Observed on staging 2026-09-17.
      //
      // The site-root surface is served from the origin root, so the route is at
      // /api/draft-mode/enable for every depth of page. An absolute path is both
      // correct and depth-proof here.
      //
      // The blog and case-studies tools below now derive theirs the same way,
      // from their own base paths (this commit).
      previewMode: { enable: '/api/draft-mode/enable' },
    },
    allowOrigins: SITE_ALLOW_ORIGINS,
    resolve: { locations: siteLocations },
  })

// Empty when no site-root preview target is wired — see SITE_PREVIEW_RAW above.
// Spread into the seven site-root workspaces so an unreleased surface simply has
// no Presentation tab, rather than one that always errors.
const sitePresentationPlugins = SITE_PREVIEW_RAW ? [sitePresentation()] : []

export default defineConfig([
  // Nine workspaces (PROD-2329 D1 + PROD-2330 D2, per D39), in switcher order:
  // Blog · Case Studies · Products · Customization · Solutions · Expertise ·
  // Resources · Main Website · Global. `admin` and `website` are retired, and an
  // "All Content" workspace is intentionally absent — D39 change (4) rejects it:
  // every workspace registers the FULL schema, so an unfiled type stays reachable
  // by search and in every reference picker, and Vision (array::unique(*[]._type))
  // audits type coverage more thoroughly than a catch-all sidebar. The guard is
  // the rule "a type isn't done until its workspace is named" (§3.1), not a
  // workspace. (PROD-2334.)

  // ── Blog — editorial team (its own site: header/footer/nav) ────────────────
  {
    name: 'blog',
    title: `Blog${datasetSuffix}`,
    basePath: '/blog',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions('blog') },
    plugins: [
      structureTool({ structure: blogStructure, defaultDocumentNode }),
      blogI18nPlugin,
      presentationTool({
        name: 'presentation',
        title: 'Presentation',
        previewUrl: {
          // `initial` (not the deprecated `origin`) so the base path survives:
          // origin is host-only.
          initial: BLOG_PREVIEW_BASE,
          // ABSOLUTE, built from this surface's base path. A RELATIVE `enable`
          // is resolved by Presentation against the iframe's CURRENT pathname,
          // not against `initial`, so it only lands correctly when the previewed
          // page sits exactly one segment under the base:
          //
          //   /blog/my-post     → /blog/api/draft-mode/enable          ✅
          //   /blog/topics/foo  → /blog/topics/api/draft-mode/enable   ❌ 404
          //
          // The depth-2 case silently 404s: the iframe renders that 404 page,
          // draft mode never engages, and Presentation reports "Unable to
          // connect" with "No matching documents". Diagnosed on the site-root
          // tool (PROD-2494) and fixed the same way here.
          //
          // Derived rather than hardcoded so it follows the env-driven base:
          // '' locally → /api/draft-mode/enable, '/blog' in prod →
          // /blog/api/draft-mode/enable. Both verified to exist (401, not 404).
          previewMode: {
            enable: `${BLOG_BASE_PATH}/api/draft-mode/enable`,
          },
        },
        allowOrigins: [
          'http://localhost:3004',
          'https://origin.blog.pakfactory.com',
          'https://pakfactory.com',
          // `pnpm studio:staging` points this workspace's preview at the staging
          // blog, which is mounted under /blog. Appended, not substituted — the
          // origins above still serve the local and production targets.
          // NOTE: that host sits behind Vercel Deployment Protection. Signed into
          // the Vercel team it serves 200 with no x-frame-options and iframes
          // fine; without a session it 302s to an SSO page carrying
          // `x-frame-options: DENY`, so the pane renders blank rather than erroring.
          'https://staging-blog.pakfactory.com',
        ],
        resolve: { locations: makeBlogWorkspaceLocations(BLOG_BASE_PATH) },
      }),
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Case Studies — case study team (previews apps/www /case-studies) ───────
  {
    name: 'caseStudies',
    title: `Case Studies${datasetSuffix}`,
    basePath: '/case-studies',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    // caseStudy needs `documentActions` so `publishCaseStudy` runs (slug-change
    // redirect + `publishedAt` backfill); without it Sanity's stock publish is
    // used and neither happens.
    document: { actions: documentActions },
    plugins: [
      structureTool({ structure: caseStudiesStructure, defaultDocumentNode }),
      presentationTool({
        name: 'presentation',
        title: 'Presentation',
        previewUrl: {
          // `initial` (not `origin`) so the `/case-studies/` path survives.
          initial: WWW_PREVIEW_BASE,
          // Same fix as the blog tool above; see that note. `/case-studies` is
          // also where nginx forwards at the apex, so the route must stay under
          // it (PROD-2223) — deriving from the base keeps both facts in one place.
          previewMode: {
            enable: `${WWW_BASE_PATH}/api/draft-mode/enable`,
          },
        },
        allowOrigins: [
          'http://localhost:3003',
          'https://pakfactory-com-www.vercel.app',
          'https://pakfactory.com',
          // Magento may serve (or 301 to) the www host; keep both so Presentation
          // does not bounce the iframe off allowOrigins after a host redirect.
          'https://www.pakfactory.com',
          // `pnpm studio:staging` previews case studies on the staging site.
          'https://staging.pakfactory.com',
        ],
        resolve: { locations: caseStudiesWorkspaceLocations },
      }),
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Products — Product Line · Product Style · Product (PROD-2309 / D39) ────
  {
    name: 'products',
    title: `Products${datasetSuffix}`,
    basePath: '/products',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions(null) },
    plugins: [
      structureTool({ structure: productsStructure, defaultDocumentNode }),
      ...sitePresentationPlugins,
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Customization — Category · Type · Option · Option Group (PROD-2309) ────
  {
    name: 'customization',
    title: `Customization${datasetSuffix}`,
    basePath: '/customization',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions(null) },
    plugins: [
      structureTool({ structure: customizationStructure, defaultDocumentNode }),
      ...sitePresentationPlugins,
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Solutions — the Solution type (30 docs) + its settings (PROD-2330 / D2) ─
  {
    name: 'solutions',
    title: `Solutions${datasetSuffix}`,
    basePath: '/solutions',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions(null) },
    plugins: [
      structureTool({ structure: solutionsWorkspaceStructure, defaultDocumentNode }),
      ...sitePresentationPlugins,
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Expertise — Expertise Stage (Expertise Service joins later) — D2 ───────
  {
    name: 'expertise',
    title: `Expertise${datasetSuffix}`,
    basePath: '/expertise',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions(null) },
    plugins: [
      structureTool({ structure: expertiseStructure, defaultDocumentNode }),
      ...sitePresentationPlugins,
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Resources — Glossary · Guide · Help Article (FAQ/Help Cat/Dieline later) ─
  {
    name: 'resources',
    title: `Resources${datasetSuffix}`,
    basePath: '/resources',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions(null) },
    plugins: [
      structureTool({ structure: resourcesWorkspaceStructure, defaultDocumentNode }),
      ...sitePresentationPlugins,
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Main Website — the pages no content area owns. Static pages today; Home/
  //    Content/Legal Page + Website Navigation pending Questions for Dev #1. ──
  {
    name: 'mainWebsite',
    title: `Main Website${datasetSuffix}`,
    basePath: '/main-website',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions(null) },
    plugins: [
      structureTool({ structure: mainWebsiteStructure, defaultDocumentNode }),
      ...sitePresentationPlugins,
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Global — taxonomy (Property, Property Value) + technical SEO (redirects,
  //    Global Settings). What applies everywhere (§3.1). PROD-2329 / D1. ──────
  {
    name: 'global',
    title: `Global${datasetSuffix}`,
    basePath: '/global',
    projectId,
    dataset,
    schema,
    ...releasesAndScheduleDisabled,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions(null) },
    plugins: [
      structureTool({ structure: globalStructure, defaultDocumentNode }),
      ...sitePresentationPlugins,
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // All nine workspaces are present (PROD-2329 D1 + PROD-2330 D2, per D39). The
  // four D2 areas ship with the types that exist today; their pending types join
  // when built: Expertise Service (Expertise); FAQ/Help Category/Dieline
  // (Resources); Home/Content/Legal Page + Website Navigation (Main Website —
  // Questions for Dev #1: shared page types vs type-per-page). The retiring `page`
  // type is deliberately filed nowhere (deletion tracked in Cleanup) — its 4 legacy
  // documents stay searchable/referenceable while they are migrated out.
])
