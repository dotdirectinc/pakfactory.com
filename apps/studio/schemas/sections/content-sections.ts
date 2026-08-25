import { defineArrayMember, defineField, defineType } from 'sanity'
import { BlockContentIcon, ImageIcon, TrendUpwardIcon, ThListIcon, HelpCircleIcon } from '@sanity/icons'
import { linkTargetFields } from '../../lib/link-target-fields'
import { faqsField } from '../../lib/faq-field'

/**
 * Content sections (Section inventory → Content). Authored page copy — no source,
 * no derivation, and NO presentation fields (D35). Each is an object type used as
 * a member of a page's `sections` array.
 */

/** Rich text — harvested from the blog's `richTextBand`, minus presentation. */
export const richText = defineType({
  name: 'richText',
  title: 'Rich text',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string', description: 'Optional section heading.' }),
    defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }], description: 'The prose.' }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title || 'Rich text' }),
  },
})

/** Media feature — harvested from `ctaSpotlight`, minus its six presentation fields. */
export const mediaFeature = defineType({
  name: 'mediaFeature',
  title: 'Media feature',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' })],
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'object',
      description: 'Optional call-to-action link. Internal references keep working when a slug changes.',
      fields: linkTargetFields({ requireLinkType: false }),
    }),
  ],
  preview: {
    select: { title: 'heading', media: 'media' },
    prepare: ({ title, media }) => ({ title: title || 'Media feature', media }),
  },
})

/** Stats — promoted from the blog body block `bodyStatStack` to a section. */
export const stats = defineType({
  name: 'stats',
  title: 'Stats',
  type: 'object',
  icon: TrendUpwardIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Stats',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stat',
          fields: [
            defineField({ name: 'value', title: 'Value', type: 'string', description: 'e.g. "500+", "48h".', validation: (Rule) => Rule.required() }),
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
          ],
          preview: { select: { title: 'value', subtitle: 'label' } },
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'heading', items: 'items' },
    prepare: ({ title, items }) => ({ title: title || 'Stats', subtitle: `${items?.length ?? 0} stat(s)` }),
  },
})

/** Steps — "how it works", and the shape the Expertise/onboarding sequence uses. */
export const steps = defineType({
  name: 'steps',
  title: 'Steps',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Steps',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'step',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
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
    prepare: ({ title, items }) => ({ title: title || 'Steps', subtitle: `${items?.length ?? 0} step(s)` }),
  },
})

/** FAQs — the shared faqs field as a section, so it stops being retyped per type. */
export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQs',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    faqsField({ mode: 'reference', max: 6, min: 3 }),
  ],
  preview: {
    select: { title: 'heading', faqs: 'faqs' },
    prepare: ({ title, faqs }) => ({ title: title || 'FAQs', subtitle: `${faqs?.length ?? 0} FAQ(s)` }),
  },
})

export const contentSections = [richText, mediaFeature, stats, steps, faqSection]
