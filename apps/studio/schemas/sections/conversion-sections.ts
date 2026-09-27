import { defineArrayMember, defineField, defineType } from 'sanity'
import { EnvelopeIcon, LinkIcon, DocumentIcon, CommentIcon } from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { dielineBorderFields } from '../../lib/dieline-border-fields'
import { linkTargetFields } from '../../lib/link-target-fields'
import { sectionFieldGroups, SECTION_GROUPS } from '../../lib/section-field-groups'
import { sectionHeaderFields } from '../../lib/section-header-fields'
import { sectionLinkTargetFields } from '../../lib/section-link-target-fields'
import { SectionTokenStringInput } from '../../components/SectionTokenStringInput'

/**
 * CTA sections (ADR-020 §10 — CTAs insert tab). Shared chrome with
 * Heading/Content/Layout field groups.
 */

/**
 * General — former SiteFooter collaborate band as a page section.
 * Defaults: muted + center; empty Button → FOOTER_CTA (/contact). Theme flips
 * band/text/button colors only. Button uses design-system link (label + targets).
 */
export const generalCta = defineType({
  name: 'generalCta',
  title: 'General',
  type: 'object',
  icon: CommentIcon,
  groups: sectionFieldGroups(),
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      group: SECTION_GROUPS.heading,
      description:
        'Headline. Leave empty to use the site default (“Let’s collaborate…”).',
      initialValue: "Let's collaborate and craft your vision",
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 2,
      group: SECTION_GROUPS.content,
      description: 'Optional supporting line under the heading.',
    }),
    defineField({
      name: 'link',
      title: 'Button',
      type: 'object',
      group: SECTION_GROUPS.content,
      description:
        'Optional. Empty → site default (“Let’s talk packaging” → /contact).',
      fields: [
        defineField({
          name: 'label',
          title: 'Button label',
          type: 'string',
          description: 'Leave empty for no custom button (site default applies).',
          initialValue: "Let's talk packaging",
        }),
        ...sectionLinkTargetFields(),
        defineField({
          name: 'query',
          title: 'Query',
          type: 'string',
          description: 'No leading ?. Example: industry=%slug%',
          components: {input: SectionTokenStringInput},
        }),
      ],
    }),
    defineField({
      name: 'theme',
      title: 'Theme',
      type: 'string',
      group: SECTION_GROUPS.layout,
      description:
        'Section color band (not site dark mode). Dark uses inverse tokens and dieline borders — not type or button size.',
      initialValue: 'muted',
      options: {
        list: [
          {title: 'Muted', value: 'muted'},
          {title: 'Dark', value: 'inverse'},
        ],
        layout: 'radio' as const,
      },
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      group: SECTION_GROUPS.layout,
      description: 'Horizontal alignment of heading, body, and button.',
      initialValue: 'center',
      options: {
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
        ],
        layout: 'radio' as const,
      },
    }),
    defineField({
      name: 'paddingBlock',
      title: 'Vertical padding',
      type: 'string',
      group: SECTION_GROUPS.layout,
      description:
        'Space above and below the section content (PageDielineSection). Default Medium.',
      initialValue: 'md',
      options: {
        list: [
          {title: 'Extra small', value: 'xs'},
          {title: 'Small', value: 'sm'},
          {title: 'Medium', value: 'md'},
          {title: 'Large', value: 'lg'},
        ],
        layout: 'radio' as const,
      },
    }),
    ...dielineBorderFields().map((field) => ({
      ...field,
      group: SECTION_GROUPS.layout,
    })),
  ],
  preview: {
    select: { title: 'heading', subtitle: 'link.label' },
    prepare: ({ title, subtitle }) => ({
      title: title || 'General',
      subtitle: subtitle || "Let's talk packaging",
    }),
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

export const conversionSections = [generalCta, newsletterCta, linkCards, contactForm]
