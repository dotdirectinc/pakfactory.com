import {defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Product Catalog Page — listable layout docs for `/products` (PROD-2589).
 *
 * www still serves the **Default** fixed id `productCatalogPage` only. Extra
 * layouts are prep/draft until a settings “active layout” pointer exists.
 * The faceted product grid is route-owned; `sections` render **below** that
 * grid. H1 / intro / SEO stay hardcoded on the www route in this pass.
 *
 * Optional `previewImage` is Studio chrome only.
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
      description:
        'Internal Studio label (e.g. "Default"). Only the Default id is live on /products today.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this catalog layout. Shown in the Product Catalog Pages list. ' +
        'Leave empty to use the default icon. Not shown on the site.',
    }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed products catalog grid on /products (Default id live). ' +
        'The faceted grid itself is not editable here — rearrange or add bands ' +
        'under the library only.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled product catalog page',
        subtitle: `Products catalog · ${count} section(s)`,
        media: media || PackageIcon,
      }
    },
  },
})
