import {defineField, defineType} from 'sanity'
import {ComponentIcon} from '@sanity/icons'

/**
 * Filterable customizations library section (PROD-1288).
 * Distinct from `customizationsRow` (catalogue strip with curated pins).
 * Presentation-free (D35): optional heading/intro + optional default category only.
 */
export const customizationsCatalog = defineType({
  name: 'customizationsCatalog',
  title: 'Customizations catalog',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Optional. Overrides the default “Customizations” heading when set.',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 3,
      description: 'Optional supporting copy above the catalog.',
    }),
    defineField({
      name: 'defaultCategory',
      title: 'Default category',
      type: 'reference',
      to: [{type: 'customizationCategory'}],
      options: {disableNew: true},
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
        title: title || 'Customizations catalog',
        subtitle: categoryTitle
          ? `Default category: ${categoryTitle}`
          : 'Full filterable library',
      }
    },
  },
})
