import { defineField, defineType } from 'sanity'
import { CaseIcon } from '@sanity/icons'

// ─────────────────────────────────────────────────────────────────────────────
// CASE STUDY — placeholder schema
// Full schema design pending. Fields will include: client (anonymized or named),
// industry ref, challenge, solution, results/metrics, packaging types used,
// key quote, imagery. See CONTEXT.md backlog.
// ─────────────────────────────────────────────────────────────────────────────

export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'industry',
      title: 'Industry',
      type: 'reference',
      to: [{ type: 'industry' }],
      description: 'The industry this case study belongs to.',
    }),
  ],
  preview: {
    select: { title: 'title', industry: 'industry.title' },
    prepare({ title, industry }) {
      return { title: title ?? 'Untitled case study', subtitle: industry ?? '' }
    },
  },
})
