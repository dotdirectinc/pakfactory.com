import { CodeBlockIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

/**
 * bodyEmbed — inline iframe embed for external tools/forms/surveys in the post
 * Portable Text body (Zoho surveys, Google Forms, Typeform, Calendly, …).
 *
 * Security: the URL must be https and its host must be on the allowlist. The
 * real gate is the blog renderer (validates against baseline ∪ Settings →
 * Additional embed hosts). This baseline list is duplicated here for
 * authoring-time feedback only — Studio does not depend on @pakfactory/sanity.
 * Keep aligned with @pakfactory/sanity/embed-allowlist EMBED_ALLOWED_HOSTS.
 */
const BASELINE_EMBED_HOSTS = [
  'zohopublic.com',
  'docs.google.com',
  'lookerstudio.google.com',
  'form.typeform.com',
  'calendly.com',
]

function hostAllowed(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    return BASELINE_EMBED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}

export const bodyEmbed = defineType({
  name: 'bodyEmbed',
  title: 'Embed (iframe)',
  type: 'object',
  icon: CodeBlockIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Embed URL',
      type: 'url',
      description:
        'https URL of the tool/form/survey to embed. Must be an approved domain — extras are managed in Global Settings → Additional embed hosts.',
      validation: (Rule) => [
        Rule.required().uri({ scheme: ['https'] }),
        Rule.custom((url?: string) =>
          !url || hostAllowed(url)
            ? true
            : 'This domain is not in the baseline allowlist. If that is intentional, add it in Global Settings → Additional embed hosts.',
        ).warning(),
      ],
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Accessible title for the embed (screen readers) and caption.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sizing',
      title: 'Sizing',
      type: 'string',
      options: {
        list: [
          { title: 'Fixed height', value: 'height' },
          { title: 'Aspect ratio', value: 'aspect' },
        ],
        layout: 'radio',
      },
      initialValue: 'height',
    }),
    defineField({
      name: 'height',
      title: 'Height (px)',
      type: 'number',
      initialValue: 600,
      hidden: ({ parent }) => parent?.sizing === 'aspect',
      validation: (Rule) => Rule.min(120).max(2000),
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect ratio',
      type: 'string',
      options: {
        list: [
          { title: '16:9', value: '16/9' },
          { title: '4:3', value: '4/3' },
          { title: '1:1', value: '1/1' },
        ],
        layout: 'radio',
      },
      initialValue: '16/9',
      hidden: ({ parent }) => parent?.sizing !== 'aspect',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption shown below the embed.',
    }),
  ],
  preview: {
    select: { title: 'title', url: 'url' },
    prepare({ title, url }) {
      return { title: title || 'Embed', subtitle: url }
    },
  },
})
