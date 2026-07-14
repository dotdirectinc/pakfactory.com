import { defineField, defineType } from 'sanity'
import { BookIcon, DocumentTextIcon, HelpCircleIcon } from '@sanity/icons'

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE DOCUMENT TYPES — placeholder schemas
// Full schema design (fields, relationships, rich content) is pending.
// These register the types so they appear in the Studio sidebar.
// ─────────────────────────────────────────────────────────────────────────────

export const glossaryTerm = defineType({
  name: 'glossaryTerm',
  title: 'Glossary Term',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({ name: 'term', title: 'Term', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'term' }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'definition', title: 'Definition', type: 'text', rows: 3 }),
  ],
  preview: {
    select: { title: 'term' },
    prepare: ({ title }) => ({ title: title ?? 'Untitled term' }),
  },
})

export const guide = defineType({
  name: 'guide',
  title: 'Guide',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: (Rule) => Rule.required() }),
  ],
  preview: {
    select: { title: 'title' },
    prepare: ({ title }) => ({ title: title ?? 'Untitled guide' }),
  },
})

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
