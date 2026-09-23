import {defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Product Catalog Page — singleton for `/products` (PROD-2589).
 *
 * Mirrors `solutionIndustryPage`: fixed document id, title + sections only.
 * The faceted product grid is route-owned; `sections` render **below** that
 * grid. H1 / intro / SEO stay hardcoded on the www route in this pass.
 *
 * Document ID `productCatalogPage`, fixed; not creatable from "create new".
 */
export const productCatalogPage = defineType({
  name: 'productCatalogPage',
  title: 'Product Catalog Page',
  type: 'document',
  icon: PackageIcon,
  groups: groupsFor(['content', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Internal Studio label.',
      initialValue: 'Product Catalog Page',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed products catalog grid on /products. ' +
        'The faceted grid itself is not editable here — rearrange or add bands ' +
        'under the library only.',
    ),
  ],
  preview: {
    prepare() {
      return {
        title: 'Product Catalog Page',
        subtitle: 'Products catalog',
      }
    },
  },
})
