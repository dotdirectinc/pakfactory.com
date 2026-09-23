import {defineField, defineType} from 'sanity'
import {ControlsIcon} from '@sanity/icons'
import {SectionItemPreview} from '../../components/SectionItemPreview'
import {sectionFieldGroups, SECTION_GROUPS} from '../../lib/section-field-groups'
import {sectionHeaderFields} from '../../lib/section-header-fields'

/**
 * Filterable customizations library (PROD-1288 · Customizations tab).
 * Distinct from `customizationsRow` (Customization row strip).
 * Shared section chrome (ADR-020) + optional default category.
 */
export const customizationsCatalog = defineType({
  name: 'customizationsCatalog',
  title: 'Customizations library',
  type: 'object',
  icon: ControlsIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields({introRows: 3}),
    defineField({
      name: 'defaultCategory',
      title: 'Default category',
      type: 'reference',
      to: [{type: 'customizationCategory'}],
      options: {disableNew: true},
      group: SECTION_GROUPS.content,
      description:
        'Optional. Opens the catalog with this category tab selected. Leave empty for All.',
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      categoryTitle: 'defaultCategory.title',
    },
    prepare({title, categoryTitle}) {
      return {
        title: title || 'Customizations library',
        subtitle: categoryTitle
          ? `Default category: ${categoryTitle}`
          : 'Full filterable library',
      }
    },
  },
  components: {preview: SectionItemPreview},
})
