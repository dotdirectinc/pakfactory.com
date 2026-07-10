import { defineField } from 'sanity'
import { BLOG_SITE_PATH_OPTIONS } from '@pakfactory/sanity/blog-site-paths'
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
 * Under Internal, editors choose CMS document or a curated site path.
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
      name: 'internalKind',
      title: 'Internal destination',
      type: 'string',
      initialValue: 'document',
      options: {
        list: [
          { title: 'CMS content', value: 'document' },
          { title: 'Site path (blog code route)', value: 'path' },
        ],
        layout: 'radio',
      },
      description:
        'CMS content links to a Sanity document. Site path is for App Router routes that are not documents (e.g. /all).',
      hidden: ({ parent }) => parent?.linkType !== 'internal',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string } | undefined
          if (parent?.linkType === 'internal' && !value) {
            return 'Choose CMS content or a site path.'
          }
          return true
        }),
    }),
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
      hidden: ({ parent }) =>
        parent?.linkType !== 'internal' || parent?.internalKind !== 'document',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | { linkType?: string; internalKind?: string }
            | undefined
          if (
            parent?.linkType === 'internal' &&
            parent?.internalKind === 'document' &&
            !value
          ) {
            return 'Select a CMS document for internal links.'
          }
          return true
        }),
    }),
    defineField({
      name: 'sitePath',
      title: 'Site path',
      type: 'string',
      description:
        'Curated blog App Router routes that are not Sanity documents (e.g. /all).',
      options: {
        list: [...BLOG_SITE_PATH_OPTIONS],
        layout: 'radio',
      },
      hidden: ({ parent }) =>
        !(
          parent?.linkType === 'internal' && parent?.internalKind === 'path'
        ) && parent?.linkType !== 'path',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | { linkType?: string; internalKind?: string }
            | undefined
          const needsPath =
            parent?.linkType === 'path' ||
            (parent?.linkType === 'internal' && parent?.internalKind === 'path')
          if (needsPath && !value) {
            return 'Select a site path.'
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
