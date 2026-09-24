import {defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Product Line Page — singleton template for Product Line LPs.
 *
 * Owns section **order + default chrome** for every `productLine` that points
 * at this doc via `productLine.template`. Per-page band content (FAQs, case
 * studies, related lines, …) stays on the product line.
 *
 * Document ID `productLinePage`, fixed; not creatable from "create new".
 * No public URL / SEO — it is a layout template, not a routable page.
 */
export const productLinePage = defineType({
  name: 'productLinePage',
  title: 'Product Line Page',
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
      initialValue: 'Product Line Page',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.productPage,
      'sections',
      'Section order and default headings for Product Line landing pages. ' +
        'Rearrange here once — every product line that selects this template ' +
        'reflects the new order. Band content (FAQs, cards, related lines) is authored on ' +
        'each product line document, matched by section key.',
    ),
  ],
  preview: {
    prepare() {
      return {
        title: 'Product Line Page',
        subtitle: 'Product line LP template',
      }
    },
  },
})
