import {defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Product Detail Page — singleton template for Product detail pages (PDPs).
 *
 * Owns section **order + default chrome** for every `product` that points at
 * this doc via `product.template`. Per-page band content stays on the product.
 *
 * Document ID `productDetailPage`, fixed; not creatable from "create new".
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
      description: 'Internal Studio label.',
      initialValue: 'Product Detail Page',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.productPage,
      'sections',
      'Section order and default headings for Product detail pages. ' +
        'Rearrange here once — every product that selects this template ' +
        'reflects the new order. Band content (FAQs, related products, reviews) is authored on ' +
        'each product document, matched by section key.',
    ),
  ],
  preview: {
    prepare() {
      return {
        title: 'Product Detail Page',
        subtitle: 'Product detail (PDP) template',
      }
    },
  },
})
