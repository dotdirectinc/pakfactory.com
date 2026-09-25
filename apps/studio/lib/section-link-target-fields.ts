import {defineField} from 'sanity'
import {
  LINKABLE_TYPE_FILTER,
  linkableReferenceTo,
  linkableTypeFilterParams,
} from './linkable-document-types'
import {validateRelativeSitePath} from './relative-site-path'

type SectionLinkParent = {
  linkType?: string
  label?: string
}

function hasButtonLabel(parent: SectionLinkParent | undefined): boolean {
  return Boolean(parent?.label?.trim())
}

/**
 * Section-chrome link targets only (ADR-020).
 * Internal · Site path · External — Site path stays root-relative so staging
 * and production use the current host (never hardcode a domain).
 * Destination is required only when Button label is set (optional CTA).
 * www nav / in-card links use {@link linkTargetFields} with `includeSitePath`.
 */
export function sectionLinkTargetFields() {
  return [
    defineField({
      name: 'linkType',
      title: 'Link type',
      type: 'string',
      options: {
        list: [
          {title: 'Internal', value: 'internal'},
          {title: 'Site path', value: 'path'},
          {title: 'External URL', value: 'external'},
        ],
        layout: 'radio',
      },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as SectionLinkParent | undefined
          if (!hasButtonLabel(parent)) return true
          if (!value) return 'Choose a link type for the button.'
          return true
        }),
    }),
    defineField({
      name: 'internalLink',
      title: 'Internal link',
      type: 'reference',
      to: linkableReferenceTo,
      description: 'CMS page. Survives slug changes.',
      options: {
        filter: LINKABLE_TYPE_FILTER,
        filterParams: linkableTypeFilterParams,
      },
      hidden: ({parent}) => parent?.linkType !== 'internal',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as SectionLinkParent | undefined
          if (!hasButtonLabel(parent)) return true
          if (parent?.linkType === 'internal' && !value) {
            return 'Select a CMS document for internal links.'
          }
          return true
        }),
    }),
    defineField({
      name: 'relativePath',
      title: 'Site path',
      type: 'string',
      description: 'Path only, e.g. /products. No domain.',
      placeholder: '/products',
      hidden: ({parent}) => parent?.linkType !== 'path',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as SectionLinkParent | undefined
          return validateRelativeSitePath(value, {
            required:
              hasButtonLabel(parent) && parent?.linkType === 'path',
          })
        }),
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      description: 'Full URL (https://…).',
      hidden: ({parent}) => parent?.linkType !== 'external',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as SectionLinkParent | undefined
          if (!hasButtonLabel(parent)) return true
          if (parent?.linkType === 'external' && !value) {
            return 'External URL is required.'
          }
          return true
        }),
    }),
  ]
}
