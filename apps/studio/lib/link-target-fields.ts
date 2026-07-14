import { defineField } from 'sanity'
import {
  LINKABLE_TYPE_FILTER,
  linkableReferenceTo,
  linkableTypeFilterParams,
} from './linkable-document-types'

export type LinkTargetFieldsOptions = {
  /**
   * When true (footer column links), linkType is required and defaults to internal.
   * When false (optional CTA links), editors may leave linkType unset for app fallbacks.
   */
  requireLinkType?: boolean
}

/**
 * Shared Internal / External link fields for Studio schemas.
 * Internal always means a CMS document reference; External is a full URL.
 * Reuse anywhere editors pick a destination (footer links, CTA blocks, future nav).
 */
export function linkTargetFields(options: LinkTargetFieldsOptions = {}) {
  const { requireLinkType = true } = options

  const linkTypeField = defineField({
    name: 'linkType',
    title: 'Link type',
    type: 'string',
    options: {
      list: [
        { title: 'Internal', value: 'internal' },
        { title: 'External URL', value: 'external' },
      ],
      layout: 'radio',
    },
    ...(requireLinkType
      ? { initialValue: 'internal' }
      : {
          description:
            'Optional. When unset, the blog falls back to the default contact link.',
        }),
    validation: requireLinkType ? (Rule) => Rule.required() : undefined,
  })

  return [
    linkTypeField,
    defineField({
      name: 'internalLink',
      title: 'Internal link',
      type: 'reference',
      to: linkableReferenceTo,
      description:
        'Pick any routable CMS document (blog, website, solutions, resources). Slug changes update the link automatically. Topic Landing, Search, and 404 pages are excluded.',
      options: {
        filter: LINKABLE_TYPE_FILTER,
        filterParams: linkableTypeFilterParams,
      },
      hidden: ({ parent }) => parent?.linkType !== 'internal',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string } | undefined
          if (parent?.linkType === 'internal' && !value) {
            return 'Select a CMS document for internal links.'
          }
          return true
        }),
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      description:
        'Full marketing-site URL (e.g. https://www.pakfactory.com/about). Renders as a plain anchor.',
      hidden: ({ parent }) => parent?.linkType !== 'external',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string } | undefined
          if (parent?.linkType === 'external' && !value) {
            return 'External URL is required.'
          }
          return true
        }),
    }),
  ]
}
