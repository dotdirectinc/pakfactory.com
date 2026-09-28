import {defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Product Detail Page — listable layout version for Product detail pages (PDPs).
 *
 * Owns section **order + default chrome** for every `product` that points at
 * this doc via `product.template`. Per-page band content stays on the product.
 * Editors can create multiple versions; products pick one on the Template tab.
 * Optional `previewImage` is Studio chrome only (list + Template picker).
 *
 * Seeded Default id `productDetailPage` keeps existing product refs working.
 * No public URL / SEO — it is a layout template, not a routable page.
 */
export const productDetailPage = defineType({
  name: 'productDetailPage',
  title: 'Product Detail Page',
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
        'Internal Studio label shown when a product picks this layout (e.g. "Default").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this PDP layout. Shown in the Product Detail Pages list and when a ' +
        'product picks this template. Leave empty to use the default icon. Not shown on the site.',
    }),
    pageSectionsField(
      SECTION_ALLOW.productPage,
      'sections',
      'Section order and default headings for products that select this layout. ' +
        'Rearrange here — every product pointed at this document reflects the new order. ' +
        'Band content (FAQs, related products, reviews) is authored on each product, ' +
        'matched by section key. Need a different arrangement? Create another Product Detail ' +
        'Page layout and point that product at it.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled product detail page',
        subtitle: `PDP layout · ${count} section(s)`,
        media: media || PackageIcon,
      }
    },
  },
})
