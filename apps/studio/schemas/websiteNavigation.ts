import { defineArrayMember, defineField, defineType } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'
import { linkTargetFields } from '../lib/link-target-fields'
import { socialLinksField } from '../lib/social-link-schema'

/**
 * Website Navigation — the main site's header and footer as one document with two
 * tabs (Entities/Website Navigation.md). Sits beside Blog Navigation in the
 * Navigation folder and reuses its link/social objects rather than duplicating.
 * Singleton, semantic ID `websiteNavigation`; not creatable from "create new".
 *
 * ⚠️ Two sites means two navigation documents that must not sit together — this is
 * the main site's, separate from Blog Navigation.
 */

/** A labelled link — internal reference or external URL (slug changes follow). */
const navLinkFields = [
  defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
  ...linkTargetFields({ requireLinkType: true }),
]

export const websiteNavigation = defineType({
  name: 'websiteNavigation',
  title: 'Website Navigation',
  type: 'document',
  icon: ThLargeIcon,
  groups: [
    { name: 'primary', title: 'Primary Navigation', default: true },
    { name: 'footer', title: 'Footer Navigation' },
  ],
  fields: [
    // ─── PRIMARY NAVIGATION ───────────────────────────────────────────────────
    defineField({
      name: 'cta',
      title: 'Header CTA',
      type: 'object',
      group: 'primary',
      description:
        'The quote button — site-wide in the header, its own button on the right of the bar, never a menu entry.',
      fields: [
        defineField({ name: 'label', title: 'Button label', type: 'string', validation: (Rule) => Rule.required() }),
        ...linkTargetFields({ requireLinkType: false }),
      ],
    }),
    defineField({
      name: 'items',
      title: 'Primary items',
      type: 'array',
      group: 'primary',
      description: 'The top-level items: Products · Customization · Solutions · Expertise · Resources.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'navItem',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'groups',
              title: 'Mega-menu groups',
              type: 'array',
              description: 'Columns/blocks in the mega-menu.',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'navGroup',
                  fields: [
                    defineField({ name: 'label', title: 'Label', type: 'string' }),
                    defineField({ name: 'descriptor', title: 'Descriptor', type: 'string', description: 'Optional, e.g. "where you sell".' }),
                    defineField({
                      name: 'items',
                      title: 'Links',
                      type: 'array',
                      of: [defineArrayMember({ type: 'object', name: 'navGroupLink', fields: navLinkFields, preview: { select: { title: 'label' } } })],
                    }),
                  ],
                  preview: { select: { title: 'label' } },
                }),
              ],
            }),
            defineField({
              name: 'promo',
              title: 'Promo',
              type: 'object',
              description: 'Optional featured card in the mega-menu.',
              options: { collapsible: true, collapsed: true },
              fields: [
                defineField({ name: 'heading', title: 'Heading', type: 'string' }),
                defineField({
                  name: 'image',
                  title: 'Image',
                  type: 'image',
                  options: { hotspot: true },
                  fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' })],
                }),
                defineField({ name: 'link', title: 'Link', type: 'object', fields: linkTargetFields({ requireLinkType: false }) }),
              ],
            }),
          ],
          preview: { select: { title: 'label' } },
        }),
      ],
    }),
    defineField({
      name: 'utility',
      title: 'Utility links',
      type: 'array',
      group: 'primary',
      description: 'Sign in, language. Search is a front-end feature, not here.',
      of: [defineArrayMember({ type: 'object', name: 'utilityLink', fields: navLinkFields, preview: { select: { title: 'label' } } })],
    }),

    // ─── FOOTER NAVIGATION ────────────────────────────────────────────────────
    defineField({
      name: 'columns',
      title: 'Footer columns',
      type: 'array',
      group: 'footer',
      description: 'Up to 3 columns, each holding titled sections of links.',
      validation: (Rule) => Rule.max(3),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'footerColumn',
          fields: [
            defineField({
              name: 'sections',
              title: 'Sections',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'footerSection',
                  fields: [
                    defineField({ name: 'title', title: 'Section title', type: 'string' }),
                    defineField({
                      name: 'links',
                      title: 'Links',
                      type: 'array',
                      of: [defineArrayMember({ type: 'object', name: 'footerLink', fields: navLinkFields, preview: { select: { title: 'label' } } })],
                    }),
                  ],
                  preview: { select: { title: 'title', links: 'links' }, prepare: ({ title, links }) => ({ title: title || 'Section', subtitle: `${links?.length ?? 0} link(s)` }) },
                }),
              ],
            }),
          ],
          preview: { select: { sections: 'sections' }, prepare: ({ sections }) => ({ title: `Column (${sections?.length ?? 0} section(s))` }) },
        }),
      ],
    }),
    socialLinksField({ context: 'footer', group: 'footer', description: 'Social profiles shown in the footer.' }),
    defineField({
      name: 'aiAnswerLinks',
      title: 'AI answer links',
      type: 'array',
      group: 'footer',
      description: 'Pre-built query URLs for answer engines — an answer-engine surface built for the blog.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'aiAnswerLink',
          fields: [
            defineField({
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: {
                list: [
                  { title: 'ChatGPT', value: 'chatgpt' },
                  { title: 'Gemini', value: 'gemini' },
                  { title: 'Perplexity', value: 'perplexity' },
                  { title: 'Claude', value: 'claude' },
                  { title: 'Grok', value: 'grok' },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'url', title: 'Query URL', type: 'url', validation: (Rule) => Rule.required() }),
          ],
          preview: { select: { title: 'platform', subtitle: 'url' } },
        }),
      ],
    }),
    defineField({
      name: 'legal',
      title: 'Legal links',
      type: 'array',
      group: 'footer',
      description: 'Privacy, terms, cookie settings.',
      of: [defineArrayMember({ type: 'object', name: 'legalLink', fields: navLinkFields, preview: { select: { title: 'label' } } })],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Website Navigation', subtitle: 'Header + footer' }
    },
  },
})
