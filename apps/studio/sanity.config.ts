import { defineConfig } from 'sanity'
import type { DocumentActionComponent, DocumentActionsContext, Template } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { visionTool } from '@sanity/vision'
import { media } from 'sanity-plugin-media'
import {
  documentInternationalization,
  useDeleteTranslationAction,
  useDuplicateWithTranslationsAction,
} from '@sanity/document-internationalization'
import { websiteLocations, blogLocations } from './presentation/locations'
import { schemaTypes } from './schemas'
import { publishWithRedirect } from './actions/publishWithRedirect'
import { publishTopicGroupToTopicsPage } from './actions/publishTopicGroupToTopicsPage'
import { BLOG_I18N_SCHEMA_TYPES, SUPPORTED_LANGUAGES } from './lib/languages'
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
const dataset = process.env.SANITY_STUDIO_DATASET || 'development'

// ── Presentation (live site preview) ─────────────────────────────────────────
// Per-workspace: the Website workspace previews apps/www, Blog previews apps/blog.
// Origins are env-overridable (set in the Studio env, exposed via SANITY_STUDIO_*).
// Each surface must run @sanity/visual-editing + a draft-mode enable route for the
// overlays to work; apps/www already does, apps/blog wiring lands on the blog branch.
const WWW_PREVIEW_ORIGIN =
  process.env.SANITY_STUDIO_PREVIEW_URL_WWW || 'http://localhost:3000'
const BLOG_PREVIEW_ORIGIN =
  process.env.SANITY_STUDIO_PREVIEW_URL_BLOG || 'http://localhost:3003'

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
      S.view.component(ProductRelatedCapabilitiesView).title('Capabilities'),
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
]

const schema = {
  types: schemaTypes,
  templates: (prev: Template[]) => [...prev, ...productTemplates, ...blogTemplates],
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

  if (isBlogI18nSchemaType(context.schemaType)) {
    actions = [
      ...actions,
      useDeleteTranslationAction,
      useDuplicateWithTranslationsAction,
    ]
  }

  return actions
}

const blogNewDocumentOptions = (
  prev: { templateId: string }[],
  { creationContext }: { creationContext: { type: string } },
) => {
  if (creationContext.type === 'structure') {
    return prev.filter((item) => item.templateId !== 'blogCategory')
  }
  return prev
}

export default defineConfig([
  // ── Admin — full access (default workspace at /) ───────────────────────────
  {
    name: 'admin',
    title: 'Global',
    basePath: '/admin',
    projectId,
    dataset,
    schema,
    document: { actions: documentActions, newDocumentOptions: blogNewDocumentOptions },
    plugins: [
      structureTool({ structure: adminStructure, defaultDocumentNode }),
      blogI18nPlugin,
      media(),
      visionTool(),
    ],
  },

  // ── Blog — editorial team ──────────────────────────────────────────────────
  {
    name: 'blog',
    title: 'Blog',
    basePath: '/blog',
    projectId,
    dataset,
    schema,
    document: { actions: documentActions, newDocumentOptions: blogNewDocumentOptions },
    plugins: [
      structureTool({ structure: blogStructure, defaultDocumentNode }),
      blogI18nPlugin,
      presentationTool({
        name: 'presentation',
        title: 'Presentation',
        previewUrl: {
          origin: BLOG_PREVIEW_ORIGIN,
          previewMode: { enable: '/api/draft-mode/enable' },
        },
        allowOrigins: [
          'http://localhost:3003',
          'https://pakfactory-blog.vercel.app',
        ],
        resolve: { locations: blogLocations },
      }),
      media(),
      visionTool(),
    ],
  },

  // ── Website — marketing / web team ────────────────────────────────────────
  {
    name: 'website',
    title: 'Website',
    basePath: '/website',
    projectId,
    dataset,
    schema,
    plugins: [
      structureTool({ structure: websiteStructure, defaultDocumentNode }),
      presentationTool({
        name: 'presentation',
        title: 'Presentation',
        previewUrl: {
          origin: WWW_PREVIEW_ORIGIN,
          previewMode: { enable: '/api/draft-mode/enable' },
        },
        resolve: { locations: websiteLocations },
      }),
      media(),
      visionTool(),
    ],
  },

  // ── Solutions — add back when Solutions workflow is defined ──────────────
  // { name: 'solutions', title: 'Solutions', basePath: '/solutions', ... }

  // ── Academy — add back when Academy schema is built ───────────────────────
  // { name: 'academy', title: 'Academy', basePath: '/academy', ... }
])
