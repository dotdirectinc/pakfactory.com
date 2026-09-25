import {defineField, defineType} from 'sanity'
import {ThLargeIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Product Style Page — singleton for shared bands under every
 * `/products/[line]/[style]` catalog (same role as `productCatalogPage`).
 *
 * The faceted product grid is route-owned; `sections` render **below** that
 * grid. Per-style copy (H1, description, media) stays on each `productStyle`.
 *
 * Document ID `productStylePage`, fixed; not creatable from "create new".
 */
export const productStylePage = defineType({
  name: 'productStylePage',
  title: 'Product Style Page',
  type: 'document',
  icon: ThLargeIcon,
  groups: groupsFor(['content', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Internal Studio label.',
      initialValue: 'Product Style Page',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed products catalog grid on every product style page. ' +
        'The faceted grid itself is not editable here — rearrange or add bands ' +
        'under the library only.',
    ),
  ],
  preview: {
    prepare() {
      return {
        title: 'Product Style Page',
        subtitle: 'Product style catalog template',
      }
    },
  },
})
