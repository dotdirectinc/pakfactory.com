import { defineArrayMember, defineField, defineType } from 'sanity'
import { RocketIcon, EnvelopeIcon, LinkIcon, DocumentIcon } from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { linkTargetFields } from '../../lib/link-target-fields'
import { sectionFieldGroups, SECTION_GROUPS } from '../../lib/section-field-groups'
import { sectionHeaderFields } from '../../lib/section-header-fields'

/**
 * CTA sections (ADR-020 §10 — CTAs insert tab). Shared chrome with
 * Heading/Content/Layout field groups.
 */

/** Get a quote — harvested from `ctaRfq`. The site-wide primary action. */
export const quoteCta = defineType({
  name: 'quoteCta',
  title: 'Get a quote',
  type: 'object',
  icon: RocketIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 2,
      group: SECTION_GROUPS.content,
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Quote button label',
      type: 'string',
      group: SECTION_GROUPS.content,
      description:
        'Label for the quote-flow button (not the optional section link above). Defaults to the site-wide quote label when empty.',
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title || 'Get a quote' }),
  },
  components: { preview: SectionItemPreview },
})

/** Newsletter — harvested from `ctaNewsletter`. */
export const newsletterCta = defineType({
  name: 'newsletterCta',
  title: 'Newsletter',
  type: 'object',
  icon: EnvelopeIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 2,
      group: SECTION_GROUPS.content,
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title || 'Newsletter' }),
  },
  components: { preview: SectionItemPreview },
})

/** Link cards — harvested from `ctaPillars`, with shared link object. */
export const linkCards = defineType({
  name: 'linkCards',
  title: 'Link cards',
  type: 'object',
  icon: LinkIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'items',
      title: 'Cards',
      type: 'array',
      group: SECTION_GROUPS.content,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'linkCard',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
            defineField({ name: 'label', title: 'Link label', type: 'string' }),
            defineField({
              name: 'link',
              title: 'Link',
              type: 'object',
              description:
                'Internal reference or external URL — internal links keep working when a slug ' +
                'changes.',
              fields: linkTargetFields({
                requireLinkType: false,
                includeSitePath: true,
              }),
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
    prepare: ({ title, items }) => ({
      title: title || 'Link cards',
      subtitle: `${items?.length ?? 0} card(s)`,
    }),
  },
  components: { preview: SectionItemPreview },
})

/** Contact form — form choice + intro. Contact details from Global Settings. */
export const contactForm = defineType({
  name: 'contactForm',
  title: 'Contact form',
  type: 'object',
  icon: DocumentIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'form',
      title: 'Form',
      type: 'string',
      group: SECTION_GROUPS.content,
      description:
        'Which form renders here. Contact details (address, email, phone) come from Global Settings — never entered here.',
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
  components: { preview: SectionItemPreview },
})

export const conversionSections = [quoteCta, newsletterCta, linkCards, contactForm]
