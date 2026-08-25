import { defineArrayMember, defineField, defineType } from 'sanity'
import { RocketIcon, EnvelopeIcon, ThLargeIcon, DocumentIcon } from '@sanity/icons'
import { linkTargetFields } from '../../lib/link-target-fields'

/**
 * Conversion sections (Section inventory → Conversion). No presentation fields
 * (D35). The Quote CTA is the site-wide primary action; contact details never
 * live here — they render from Global Settings.
 */

/** Quote CTA — harvested from `ctaRfq`. The site-wide primary action. */
export const quoteCta = defineType({
  name: 'quoteCta',
  title: 'Quote CTA',
  type: 'object',
  icon: RocketIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'body', title: 'Body', type: 'text', rows: 2 }),
    defineField({
      name: 'ctaLabel',
      title: 'Button label',
      type: 'string',
      description: 'Defaults to the site-wide quote label when empty. The destination is the quote flow — not a link.',
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title || 'Quote CTA' }),
  },
})

/** Newsletter CTA — harvested from `ctaNewsletter`. */
export const newsletterCta = defineType({
  name: 'newsletterCta',
  title: 'Newsletter CTA',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'body', title: 'Body', type: 'text', rows: 2 }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title || 'Newsletter CTA' }),
  },
})

/** Link cards — harvested from `ctaPillars`, with `href` replaced by the shared link object (bug 4). */
export const linkCards = defineType({
  name: 'linkCards',
  title: 'Link cards',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'linkCard',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
            defineField({ name: 'label', title: 'Link label', type: 'string' }),
            defineField({
              name: 'link',
              title: 'Link',
              type: 'object',
              description: 'Internal reference or external URL — internal links keep working when a slug changes (replaces the old hard-coded URL).',
              fields: linkTargetFields({ requireLinkType: false }),
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'heading', items: 'items' },
    prepare: ({ title, items }) => ({ title: title || 'Link cards', subtitle: `${items?.length ?? 0} card(s)` }),
  },
})

/** Contact form — form choice + intro. Contact details render from Global Settings, never retyped. */
export const contactForm = defineType({
  name: 'contactForm',
  title: 'Contact form',
  type: 'object',
  icon: DocumentIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'intro', title: 'Intro', type: 'text', rows: 2 }),
    defineField({
      name: 'form',
      title: 'Form',
      type: 'string',
      description: 'Which form renders here. Contact details (address, email, phone) come from Global Settings — never entered here.',
      options: {
        layout: 'radio',
        list: [
          { title: 'General contact', value: 'contact' },
          { title: 'Request a quote', value: 'quote' },
          { title: 'Request a sample', value: 'sample' },
        ],
      },
      initialValue: 'contact',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'heading', form: 'form' },
    prepare: ({ title, form }) => ({ title: title || 'Contact form', subtitle: form }),
  },
})

export const conversionSections = [quoteCta, newsletterCta, linkCards, contactForm]
