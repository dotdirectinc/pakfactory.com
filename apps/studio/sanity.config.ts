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
import { websiteLocations, makeBlogLocations } from './presentation/locations'
import { schemaTypes } from './schemas'
import { publishWithRedirect } from './actions/publishWithRedirect'
import { publishCaseStudy } from './actions/publishCaseStudy'
import { publishTopicGroupToTopicsPage } from './actions/publishTopicGroupToTopicsPage'
import { BLOG_I18N_SCHEMA_TYPES, SUPPORTED_LANGUAGES } from './lib/languages'
import { CHANNELS } from './lib/channels'
import {
  adminStructure,
  blogStructure,
  websiteStructure,
  solutionsStructure,
  academyStructure,
} from './structure'
import { BlogCategoryPostsView } from './components/BlogCategoryPostsView'
import { RelatedPostsView } from './components/RelatedPostsView'
import { RelatedPostsByTagView } from './components/RelatedPostsByTagView'
import { RelatedPostsByAuthorView } from './components/RelatedPostsByAuthorView'
import { ProductStyleCategoryProductsView } from './components/ProductStyleCategoryProductsView'
import { ProductRelatedCapabilitiesView } from './components/ProductRelatedCapabilitiesView'

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
  process.env.SANITY_STUDIO_PREVIEW_URL_WWW || 'http://localhost:3000/case-studies/'
const WWW_PREVIEW_BASE = WWW_PREVIEW_RAW.endsWith('/')
  ? WWW_PREVIEW_RAW
  : `${WWW_PREVIEW_RAW}/`

// Blog preview BASE — a full URL that may carry a path (the `/blog` basePath in
// prod). Presentation resolves the draft-mode enable path and location hrefs
// against this, so it MUST end in a trailing slash: a relative `enable`
// ('api/draft-mode/enable') only appends under the base path when the base ends
// in '/' (PROD-2223). Prod → 'https://pakfactory.com/blog/' (the apex, served by
// nginx — the origin.blog host now 307-redirects direct hits to the apex),
// local → 'http://localhost:3003/'.
const BLOG_PREVIEW_RAW =
  process.env.SANITY_STUDIO_PREVIEW_URL_BLOG || 'http://localhost:3003/'
const BLOG_PREVIEW_BASE = BLOG_PREVIEW_RAW.endsWith('/')
  ? BLOG_PREVIEW_RAW
  : `${BLOG_PREVIEW_RAW}/`
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
      primaryClassification: 'standard',
      productCategories: [{ _type: 'reference', _ref: categoryId }],
      productStyleCategories: [{ _type: 'reference', _ref: styleId }],
    }),
  },
  {
    id: 'product-industry',
    title: 'Product (Industry)',
    schemaType: 'product',
    parameters: [
      { name: 'industryId', title: 'Industry ID', type: 'string' },
      { name: 'industryCategoryId', title: 'Industry Category ID', type: 'string' },
    ],
    value: ({ industryId, industryCategoryId }: { industryId: string; industryCategoryId: string }) => ({
      primaryClassification: 'industry',
      industries: [{ _type: 'reference', _ref: industryId }],
      industryCategories: [{ _type: 'reference', _ref: industryCategoryId }],
    }),
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
  if (schemaType === 'productStyleCategory') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(ProductStyleCategoryProductsView).title('Products'),
    ])
  }
  if (schemaType === 'product') {
    return S.document().views([
      S.view.form().title('Edit'),
      S.view.component(ProductRelatedCapabilitiesView).title('Customization'),
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
  templates: (prev: Template[]) => [
    ...prev,
    ...productTemplates,
    ...blogTemplates,
    ...videoTemplates,
  ],
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

// Replace the default publish action on posts so slug changes auto-create redirects.
const documentActions = (
  prev: DocumentActionComponent[],
  context: DocumentActionsContext,
): DocumentActionComponent[] => {
  let actions = prev
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
      useDeleteTranslationAction,
      useDuplicateWithTranslationsAction,
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
    let opts = prev.filter((item) => item.templateId !== 'blogCategory')
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

export default defineConfig([
  // ── Admin — full access (default workspace at /) ───────────────────────────
  {
    name: 'admin',
    title: `Global${datasetSuffix}`,
    basePath: '/admin',
    projectId,
    dataset,
    schema,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions(null) },
    plugins: [
      structureTool({ structure: adminStructure, defaultDocumentNode }),
      blogI18nPlugin,
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Blog — editorial team ──────────────────────────────────────────────────
  {
    name: 'blog',
    title: `Blog${datasetSuffix}`,
    basePath: '/blog',
    projectId,
    dataset,
    schema,
    document: { actions: documentActions, newDocumentOptions: makeNewDocumentOptions('blog') },
    plugins: [
      structureTool({ structure: blogStructure, defaultDocumentNode }),
      blogI18nPlugin,
      presentationTool({
        name: 'presentation',
        title: 'Presentation',
        previewUrl: {
          // `initial` (not the deprecated `origin`) so the base path survives:
          // origin is host-only. `enable` is RELATIVE (no leading slash) so it
          // resolves under the base's path → `${base}api/draft-mode/enable`
          // (a leading slash would drop `/blog`). PROD-2223.
          initial: BLOG_PREVIEW_BASE,
          previewMode: { enable: 'api/draft-mode/enable' },
        },
        allowOrigins: [
          'http://localhost:3003',
          'https://origin.blog.pakfactory.com',
          'https://pakfactory.com',
        ],
        resolve: { locations: makeBlogLocations(BLOG_BASE_PATH) },
      }),
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Website — marketing / web team ────────────────────────────────────────
  {
    name: 'website',
    title: `Marketing Website${datasetSuffix}`,
    basePath: '/website',
    projectId,
    dataset,
    schema,
    // Case studies are edited here, so this workspace needs `documentActions` too —
    // without it `caseStudy` falls back to Sanity's stock publish and
    // `publishCaseStudy` never runs (no slug-change redirect, no `publishedAt`
    // backfill). Only `newDocumentOptions` stays workspace-specific.
    document: { actions: documentActions },
    plugins: [
      structureTool({ structure: websiteStructure, defaultDocumentNode }),
      presentationTool({
        name: 'presentation',
        title: 'Presentation',
        previewUrl: {
          // `initial` (not `origin`) so the `/case-studies/` path survives; a
          // relative `enable` (no leading slash) resolves under it →
          // `…/case-studies/api/draft-mode/enable` (a leading slash would drop the
          // path and hit Magento at the apex root). PROD-2223.
          initial: WWW_PREVIEW_BASE,
          previewMode: { enable: 'api/draft-mode/enable' },
        },
        allowOrigins: [
          'http://localhost:3000',
          'https://pakfactory-com-www.vercel.app',
          'https://pakfactory.com',
          // Magento may serve (or 301 to) the www host; keep both so Presentation
          // does not bounce the iframe off allowOrigins after a host redirect.
          'https://www.pakfactory.com',
        ],
        resolve: { locations: websiteLocations },
      }),
      colorInput(),
      media(),
      visionTool(),
    ],
  },

  // ── Solutions — add back when Solutions workflow is defined ──────────────
  // { name: 'solutions', title: 'Solutions', basePath: '/solutions', ... }

  // ── Academy — add back when Academy schema is built ───────────────────────
  // { name: 'academy', title: 'Academy', basePath: '/academy', ... }
])
