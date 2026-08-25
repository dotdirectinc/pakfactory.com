import { defineField, defineType } from 'sanity'
import { HelpCircleIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'

/**
 * FAQ — one question, one answer, one document (Entities/FAQ.md). The Help Center
 * browses `general` answers; commercial pages curate a few by reference. Every
 * Q&A is a document — nothing is typed inline on a browsable page — because an
 * answer typed into a page is invisible to search, so the next editor writes a
 * second version instead of finding the first.
 *
 * ⚠️ `slug` is not in the entity spec's field table, but the URL it defines —
 * `/help/<category>/<answer>` for `general` answers — needs an answer segment.
 * Added here (sourced from the question) so general answers have a stable,
 * citable URL; flagged for Eric on PROD-2289.
 */
export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  icon: HelpCircleIcon,
  groups: groupsFor(['content', 'categorization']),
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      group: GROUPS.content,
      description: 'As a customer would ask it, not as an internal label.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description:
        'The answer segment of /help/<category>/<answer>. Only general answers get a URL; kept for all so a contextual answer promoted to general already has one.',
      options: { source: 'question' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'array',
      group: GROUPS.content,
      description:
        'Must be self-contained. Links and lists allowed. State a per-product number never (it is a field and a typed copy goes stale) — a category-level range may, and always point at where the exact number lives.',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'scope',
      title: 'Scope',
      type: 'string',
      group: GROUPS.content,
      description:
        'General answers are browsable in the Help Center and get a URL. Contextual answers are searchable there and served on the pages that reference them — they never appear in a category browse listing and have no URL of their own.',
      options: {
        layout: 'radio',
        list: [
          { title: 'General — browsable, has a URL', value: 'general' },
          { title: 'Contextual — searchable / referenced only', value: 'contextual' },
        ],
      },
      initialValue: 'general',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Help Category',
      type: 'reference',
      group: GROUPS.categorization,
      description:
        'Required on every FAQ, including contextual ones the Help Center never lists — the reference is what builds each category page.',
      to: [{ type: 'helpCategory' }],
      // §4.2: pick an existing category; the eight are a fixed set.
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'about',
      title: 'About',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Optional — the line, style, product, solution or customization this question is about. Findability and Studio filtering only, never rendered on the page.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productLine' },
            { type: 'productStyle' },
            { type: 'product' },
            { type: 'solution' },
            { type: 'customizationOption' },
          ],
        },
      ],
    }),
    defineField({
      name: 'relatedLinks',
      title: 'Related links',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Optional — what the answer points to in its body.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productLine' },
            { type: 'productStyle' },
            { type: 'product' },
            { type: 'solution' },
            { type: 'customizationOption' },
            { type: 'guide' },
            { type: 'glossaryTerm' },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'question', category: 'category.title', scope: 'scope' },
    prepare({ title, category, scope }) {
      const tag = scope === 'contextual' ? 'Contextual' : 'General'
      return {
        title: title || 'Untitled question',
        subtitle: [category, tag].filter(Boolean).join(' · '),
      }
    },
  },
})
