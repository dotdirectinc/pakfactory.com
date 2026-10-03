import {defineArrayMember, defineField, defineType} from 'sanity'
import {TagsIcon} from '@sanity/icons'
import {SectionItemPreview} from '../../components/SectionItemPreview'
import {sectionFieldGroups, SECTION_GROUPS} from '../../lib/section-field-groups'
import {sectionHeaderFields} from '../../lib/section-header-fields'

/**
 * Inspiration by industry (ADR-020) — Solutions tab.
 * Product-line host: left-rail industries + inspiration product cards for that line.
 * Empty industries → www lists every industry that has products for the host line.
 */
export const inspirationIndustry = defineType({
  name: 'inspirationIndustry',
  title: 'Inspiration by industry',
  type: 'object',
  icon: TagsIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'industries',
      title: 'Industries',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Optional. Leave empty to show every industry that has inspiration products for this product line. When set, pills follow this order and empty industries are hidden.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'solution'}],
          options: {
            disableNew: true,
            filter: 'solutionType == "industry"',
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'heading', industries: 'industries'},
    prepare: ({title, industries}) => {
      const count = Array.isArray(industries) ? industries.length : 0
      return {
        title: title || 'Inspiration by industry',
        subtitle:
          count > 0 ? `${count} industr${count === 1 ? 'y' : 'ies'}` : 'All industries',
      }
    },
  },
  components: {preview: SectionItemPreview},
})
