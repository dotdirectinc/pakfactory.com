import { defineField, defineType } from 'sanity'
import { HelpCircleIcon } from '@sanity/icons'

// ─────────────────────────────────────────────────────────────────────────────
// Resource document types now live in their own files:
//   faq.ts · helpCategory.ts (PROD-2289 pt 1) · guide.ts · glossaryTerm.ts ·
//   dieline.ts (PROD-2289 pt 2).
// `helpArticle` remains here as a skeleton pending retirement (PROD-2289 pt 3):
// it holds zero documents and splits into FAQ + Help Category + Guide.
// ─────────────────────────────────────────────────────────────────────────────

export const helpArticle = defineType({
  name: 'helpArticle',
  title: 'Help Article',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: (Rule) => Rule.required() }),
  ],
  preview: {
    select: { title: 'title' },
    prepare: ({ title }) => ({ title: title ?? 'Untitled article' }),
  },
})
