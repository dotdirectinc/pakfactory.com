import { defineConfig } from 'sanity'
import type { DocumentActionComponent, DocumentActionsContext, Template } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'
import { publishWithRedirect } from './actions/publishWithRedirect'
import {
  adminStructure,
  blogStructure,
  websiteStructure,
  academyStructure,
} from './structure'
import { RelatedPostsView } from './components/RelatedPostsView'
import { RelatedPostsByTagView } from './components/RelatedPostsByTagView'
import { RelatedPostsByAuthorView } from './components/RelatedPostsByAuthorView'
import { ProductStyleCategoryProductsView } from './components/ProductStyleCategoryProductsView'
import { ProductRelatedCapabilitiesView } from './components/ProductRelatedCapabilitiesView'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!
const dataset = process.env.SANITY_STUDIO_DATASET || 'development'

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
      S.view.component(RelatedPostsView).title('Related Posts'),
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

const schema = { types: schemaTypes, templates: (prev: Template[]) => [...prev, ...productTemplates] }

// Replace the default publish action on posts so slug changes auto-create redirects.
const documentActions = (
  prev: DocumentActionComponent[],
  context: DocumentActionsContext,
): DocumentActionComponent[] =>
  context.schemaType === 'post'
    ? prev.map((action) => (action.action === 'publish' ? publishWithRedirect : action))
    : prev

export default defineConfig([
  // ── Admin — full access (default workspace at /) ───────────────────────────
  {
    name: 'admin',
    title: 'PakFactory (Admin)',
    basePath: '/admin',
    projectId,
    dataset,
    schema,
    document: { actions: documentActions },
    plugins: [
      structureTool({ structure: adminStructure, defaultDocumentNode }),
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
    document: { actions: documentActions },
    plugins: [
      structureTool({ structure: blogStructure, defaultDocumentNode }),
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
      visionTool(),
    ],
  },

  // ── Academy — placeholder, Knowledge Library + Settings only ──────────────
  {
    name: 'academy',
    title: 'Academy',
    basePath: '/academy',
    projectId,
    dataset,
    schema,
    plugins: [
      structureTool({ structure: academyStructure, defaultDocumentNode }),
      visionTool(),
    ],
  },
])
