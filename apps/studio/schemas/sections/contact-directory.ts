import {defineArrayMember, defineField, defineType} from 'sanity'
import {EnvelopeIcon} from '@sanity/icons'
import {SectionItemPreview} from '../../components/SectionItemPreview'
import {dielineBorderFields} from '../../lib/dieline-border-fields'
import {sectionFieldGroups, SECTION_GROUPS} from '../../lib/section-field-groups'
import {sectionHeaderFields} from '../../lib/section-header-fields'

/**
 * Contact directory — live-support rail (Global Settings) + ways-to-reach-us
 * rows. Allowed on Content Pages only (SECTION_ALLOW.content). Phone, email
 * and address are never authored here. No band theme — dual-rail chrome is fixed.
 */
export const contactDirectory = defineType({
  name: 'contactDirectory',
  title: 'Contact directory',
  type: 'object',
  icon: EnvelopeIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields({introRows: 3}),
    defineField({
      name: 'showLiveSupport',
      title: 'Show live support rail',
      type: 'boolean',
      group: SECTION_GROUPS.content,
      description:
        'Left column: phone, email, hours and address from Global Settings. Off hides the rail.',
      initialValue: true,
    }),
    defineField({
      name: 'channels',
      title: 'Ways to reach us',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Rows in the directory. Each row is a Link, Chat, or Enquiry. Phone, email and ' +
        'address come from Global Settings — never enter them here.',
      of: [defineArrayMember({type: 'contactChannel'})],
      validation: (Rule) =>
        Rule.custom((channels) => {
          if (!Array.isArray(channels) || channels.length < 1) {
            return 'Add at least one way to reach us.'
          }
          const slugs = channels
            .filter(
              (row): row is {_key?: string; action?: string; enquirySlug?: {current?: string}} =>
                Boolean(row) && typeof row === 'object',
            )
            .filter((row) => row.action === 'enquiry')
            .map((row) => row.enquirySlug?.current?.trim())
            .filter((slug): slug is string => Boolean(slug))
          const seen = new Set<string>()
          for (const slug of slugs) {
            if (seen.has(slug)) {
              return `Enquiry slug "${slug}" is used more than once.`
            }
            seen.add(slug)
          }
          return true
        }),
    }),
    defineField({
      name: 'paddingBlock',
      title: 'Vertical padding',
      type: 'string',
      group: SECTION_GROUPS.layout,
      description:
        'Space above and below the directory band (PageDielineSection). Default None keeps the hub flush.',
      initialValue: 'none',
      options: {
        list: [
          {title: 'None', value: 'none'},
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
    select: {title: 'heading', channels: 'channels'},
    prepare: ({title, channels}) => ({
      title: title || 'Contact directory',
      subtitle: `${Array.isArray(channels) ? channels.length : 0} way(s) to reach us`,
    }),
  },
  components: {preview: SectionItemPreview},
})
