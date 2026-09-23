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
  /**
   * When true (section CTAs), External accepts site-relative paths like `/products`.
   * Footer/nav keep absolute URLs only.
   */
  allowRelativeExternal?: boolean
}

/**
 * Shared Internal / External link fields for Studio schemas.
 * Internal always means a CMS document reference; External is a full URL
 * (or site-relative path when `allowRelativeExternal` is set).
 * Reuse anywhere editors pick a destination (footer links, CTA blocks, future nav).
 */
export function linkTargetFields(options: LinkTargetFieldsOptions = {}) {
  const { requireLinkType = true, allowRelativeExternal = false } = options

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
        'Pick any CMS document that has a page of its own (blog, website, solutions, resources). Slug ' +
        'changes update the link automatically. Topic Landing, Search and 404 pages are excluded.',
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
      title: allowRelativeExternal ? 'URL or path' : 'External URL',
      type: 'url',
      description: allowRelativeExternal
        ? 'Full URL (https://…) or site path (e.g. /products). Prefer Internal when a CMS page exists.'
        : 'A full URL (e.g. https://www.pakfactory.com/about).',
      ...(allowRelativeExternal ? {options: {allowRelative: true}} : {}),
      hidden: ({ parent }) => parent?.linkType !== 'external',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string } | undefined
          if (parent?.linkType === 'external' && !value) {
            return allowRelativeExternal
              ? 'URL or path is required.'
              : 'External URL is required.'
          }
          return true
        }),
    }),
  ]
}
