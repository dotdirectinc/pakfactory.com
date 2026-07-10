import { defineArrayMember, defineField, defineType } from 'sanity'
import { socialLinksField } from '../lib/social-link-schema'
import { ALL_FIELDS_GROUP } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'
import { linkTargetFields } from '../lib/link-target-fields'

const footerLinkFields = [
  ...linkTargetFields({ requireLinkType: true }),
  defineField({
    name: 'label',
    title: 'Label',
    type: 'string',
    description:
      'Optional display text. When empty, the linked document title is used for internal links.',
  }),
]

const footerSectionMember = defineArrayMember({
  type: 'object',
  name: 'footerSection',
  fields: [
    defineField({
      name: 'title',
      title: 'Section title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'footerLink',
          fields: footerLinkFields,
          preview: {
            select: {
              label: 'label',
              linkType: 'linkType',
              externalUrl: 'externalUrl',
              internalTitle: 'internalLink.title',
              internalType: 'internalLink._type',
              internalSlug: 'internalLink.slug.current',
            },
            prepare({
              label,
              linkType,
              externalUrl,
              internalTitle,
              internalType,
              internalSlug,
            }) {
              const title = label?.trim() || internalTitle || 'Untitled link'
              if (linkType === 'external') {
                return {
                  title,
                  subtitle: externalUrl ? `External · ${externalUrl}` : 'External link',
                }
              }
              const slugHint =
                internalType === 'blogTag'
                  ? `/topics/${internalSlug ?? '…'}`
                  : internalType === 'author'
                    ? `/author/${internalSlug ?? '…'}`
                    : internalSlug
                      ? `/${internalSlug}`
                      : 'Internal link'
              return {
                title,
                subtitle: internalType ? `${internalType} · ${slugHint}` : slugHint,
              }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'title', links: 'links' },
    prepare({ title, links }) {
      const count = Array.isArray(links) ? links.length : 0
      return {
        title: title || 'Untitled section',
        subtitle: count === 1 ? '1 link' : `${count} links`,
      }
    },
  },
})

const footerColumnMember = defineArrayMember({
  type: 'object',
  name: 'footerColumn',
  fields: [
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [footerSectionMember],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { sections: 'sections' },
    prepare({ sections }) {
      const list = Array.isArray(sections) ? sections : []
      const count = list.length
      const firstTitle = list[0]?.title?.trim()
      const sectionNames = list
        .map((s) => s?.title?.trim())
        .filter(Boolean)
        .join(', ')
      return {
        title: firstTitle ? `Column — ${firstTitle}` : 'Footer column',
        subtitle:
          count === 0
            ? 'No sections'
            : sectionNames.length > firstTitle.length + 2
              ? `${count} sections · ${sectionNames}`
              : count === 1
                ? '1 section'
                : `${count} sections`,
      }
    },
  },
})

/**
 * Blog Navigation (singleton) — primary category nav order and footer link columns.
 * Consumed by apps/blog header (primary) and footer link grid (footer).
 */
export const blogNavigation = defineType({
  name: 'blogNavigation',
  title: 'Blog Navigation',
  type: 'document',
  icon: ThLargeIcon,
  groups: [
    { ...ALL_FIELDS_GROUP, hidden: true },
    { name: 'primary', title: 'Primary Navigation', default: true },
    { name: 'footer', title: 'Footer Navigation' },
  ],
  fields: [
    defineField({
      name: 'primaryNavigation',
      title: 'Primary Navigation',
      type: 'object',
      group: 'primary',
      options: { collapsible: false },
      fields: [
        defineField({
          name: 'categories',
          title: 'Category navigation order',
          type: 'array',
          description:
            'Categories shown in the primary nav / category strip, in display order. Drag to reorder.',
          of: [{ type: 'reference', to: [{ type: 'blogCategory' }] }],
          validation: (Rule) => Rule.unique(),
        }),
      ],
    }),
    defineField({
      name: 'footerNavigation',
      title: 'Footer Navigation',
      type: 'object',
      group: 'footer',
      description:
        'Footer blocks (above the navigation), footer link grid, social icons, and AI answer-engine links. Copyright lines are not editable here.',
      options: { collapsible: false },
      fields: [
        defineField({
          name: 'builder',
          title: 'Footer blocks',
          type: 'pageBuilderFooter',
          description:
            'Blocks rendered above the footer navigation. Currently: CTA — Text and Button.',
        }),
        defineField({
          name: 'columns',
          title: 'Footer columns',
          type: 'array',
          description:
            'Up to 3 columns, left to right. Matches the footer link grid on the blog. Each column holds one or more titled link sections.',
          of: [footerColumnMember],
          validation: (Rule) =>
            Rule.max(3).warning('Layout supports 3 columns on desktop.'),
        }),
        socialLinksField({
          context: 'footer',
          description:
            'Social profile icons shown in the footer bottom bar. When empty, the blog falls back to built-in defaults.',
        }),
        defineField({
          name: 'aiAnswerLinks',
          title: 'AI answer links',
          type: 'array',
          description:
            'Links for the "See what AI says about PakFactory" row. When empty, the blog falls back to built-in default query URLs.',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'footerAiAnswerLink',
              fields: [
                defineField({
                  name: 'engine',
                  title: 'AI engine',
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
                defineField({
                  name: 'url',
                  title: 'URL',
                  type: 'url',
                  description:
                    'Full URL including the query (e.g. https://chatgpt.com/?q=What+is+PakFactory+%28pakfactory.com%29%3F+Summarize+what+they+do%2C+who+they+serve%2C+and+cite+your+sources.). Include brand name and domain in the prompt for best results.',
                  validation: (Rule) => Rule.required(),
                }),
              ],
              preview: {
                select: { engine: 'engine', url: 'url' },
                prepare({ engine, url }) {
                  const labels: Record<string, string> = {
                    chatgpt: 'ChatGPT',
                    gemini: 'Gemini',
                    perplexity: 'Perplexity',
                    claude: 'Claude',
                    grok: 'Grok',
                  }
                  return {
                    title: labels[engine ?? ''] ?? 'AI engine',
                    subtitle: url ?? 'No URL',
                  }
                },
              },
            }),
          ],
          validation: (Rule) =>
            Rule.custom((links) => {
              if (!Array.isArray(links)) return true
              const engines = links
                .map((link) => (link as { engine?: string })?.engine)
                .filter(Boolean)
              const unique = new Set(engines)
              if (unique.size !== engines.length) {
                return 'Each AI engine can only appear once.'
              }
              return true
            }),
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Blog Navigation' }
    },
  },
})
