import { defineArrayMember, defineField, defineType } from 'sanity'
import { BlockContentIcon, ImageIcon, TrendUpwardIcon, ThListIcon, HelpCircleIcon } from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { faqsField } from '../../lib/faq-field'
import { sectionFieldGroups, SECTION_GROUPS } from '../../lib/section-field-groups'
import { sectionHeaderFields } from '../../lib/section-header-fields'

/**
 * Layout-family content sections (ADR-020). Shared chrome with Heading/Layout
 * tabs; payload on Content. Theme/columns stay in React (D35).
 */

/** Rich text — harvested from the blog's `richTextBand`, minus presentation. */
export const richText = defineType({
  name: 'richText',
  title: 'Rich text',
  type: 'object',
  icon: BlockContentIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'The prose.',
      group: SECTION_GROUPS.content,
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title || 'Rich text' }),
  },
  components: { preview: SectionItemPreview },
})

/** Image with text — harvested from `ctaSpotlight`, minus presentation fields. */
export const mediaFeature = defineType({
  name: 'mediaFeature',
  title: 'Image with text',
  type: 'object',
  icon: ImageIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
      group: SECTION_GROUPS.content,
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'image',
      options: { hotspot: true },
      group: SECTION_GROUPS.content,
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the image for screen readers and SEO.',
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', media: 'media' },
    prepare: ({ title, media }) => ({ title: title || 'Image with text', media }),
  },
  components: { preview: SectionItemPreview },
})

/** Stats — promoted from the blog body block `bodyStatStack` to a section. */
export const stats = defineType({
  name: 'stats',
  title: 'Stats',
  type: 'object',
  icon: TrendUpwardIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'items',
      title: 'Stats',
      type: 'array',
      group: SECTION_GROUPS.content,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stat',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'The figure itself (e.g. "500+" or "48h").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'value', subtitle: 'label' } },
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'heading', items: 'items' },
    prepare: ({ title, items }) => ({
      title: title || 'Stats',
      subtitle: `${items?.length ?? 0} stat(s)`,
    }),
  },
  components: { preview: SectionItemPreview },
})

/** Steps — "how it works" layout band. */
export const steps = defineType({
  name: 'steps',
  title: 'Steps',
  type: 'object',
  icon: ThListIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'items',
      title: 'Steps',
      type: 'array',
      group: SECTION_GROUPS.content,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'step',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'body', title: 'Body', type: 'text', rows: 3 }),
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'heading', items: 'items' },
    prepare: ({ title, items }) => ({
      title: title || 'Steps',
      subtitle: `${items?.length ?? 0} step(s)`,
    }),
  },
  components: { preview: SectionItemPreview },
})

/** FAQs — optional section override; empty → document Categorization FAQs. */
export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQs',
  type: 'object',
  icon: HelpCircleIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    faqsField({
      mode: 'reference',
      max: 6,
      group: SECTION_GROUPS.content,
      description:
        'Optional override for this band. Leave empty to use the document’s ' +
        'Categorization FAQs. Fill only when this page needs a different set.',
    }),
  ],
  preview: {
    select: { title: 'heading', faqs: 'faqs' },
    prepare: ({ title, faqs }) => {
      const count = faqs?.length ?? 0
      return {
        title: title || 'FAQs',
        subtitle: count > 0 ? `${count} FAQ(s)` : 'Uses document FAQs',
      }
    },
  },
  components: { preview: SectionItemPreview },
})

export const contentSections = [richText, mediaFeature, stats, steps, faqSection]
