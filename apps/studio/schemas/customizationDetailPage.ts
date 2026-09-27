import {defineField, defineType} from 'sanity'
import {ComponentIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Customization Detail Page — singleton for shared bands under every
 * `/customizations/[category]/[handle]` detail (same role as `productStylePage`).
 *
 * Hero / gallery / peer chrome stay route-owned; `sections` render **below**
 * that chrome. Per-option copy stays on each `customizationOption`.
 *
 * Document ID `customizationDetailPage`, fixed; not creatable from "create new".
 */
export const customizationDetailPage = defineType({
  name: 'customizationDetailPage',
  title: 'Customization Detail Page',
  type: 'document',
  icon: ComponentIcon,
  groups: groupsFor(['content', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Internal Studio label.',
      initialValue: 'Customization Detail Page',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed customization detail chrome on every option page. ' +
        'The overview itself is not editable here — rearrange or add bands under the detail only.',
    ),
  ],
  preview: {
    prepare() {
      return {
        title: 'Customization Detail Page',
        subtitle: 'Customization detail template',
      }
    },
  },
})
