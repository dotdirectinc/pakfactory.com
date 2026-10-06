import {defineField, defineType} from 'sanity'
import {BulbOutlineIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Solution Product Detail Page — listable layout for inspiration (solution) PDPs.
 *
 * Twin of `productDetailPage`: owns section **order + default chrome** for every
 * `product` with `kind == "inspiration"` that points here via `product.template`.
 * Band content (related products, FAQs, …) stays on the product, matched by key.
 *
 * Seeded Default id `solutionProductDetailPage`. No public URL / SEO — layout
 * template only (PROD-2763).
 */
export const solutionProductDetailPage = defineType({
  name: 'solutionProductDetailPage',
  title: 'Solution Product Detail Page',
  type: 'document',
  icon: BulbOutlineIcon,
  groups: groupsFor(['content', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'Internal Studio label shown when an inspiration product picks this layout (e.g. "Default").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this PDP layout. Shown in the Solution Product Detail Pages list and when an ' +
        'inspiration product picks this template. Leave empty to use the default icon. Not shown on the site.',
    }),
    pageSectionsField(
      SECTION_ALLOW.productPage,
      'sections',
      'Section order and default headings for inspiration products that select this layout. ' +
        'Rearrange here — every product pointed at this document reflects the new order. ' +
        'Band content (FAQs, related products, reviews) is authored on each product, ' +
        'matched by section key. Need a different arrangement? Create another Solution Product ' +
        'Detail Page layout and point that product at it.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled solution product detail page',
        subtitle: `Inspiration PDP layout · ${count} section(s)`,
        media: media || BulbOutlineIcon,
      }
    },
  },
})
