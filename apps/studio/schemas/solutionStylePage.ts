import {defineField, defineType} from 'sanity'
import {ThLargeIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Solution Style Page — singleton for shared bands under every
 * `/solutions/[solution]/[style]` catalog (same role as `productStylePage`).
 *
 * The faceted product grid is route-owned; `sections` render **below** that
 * grid. Per-style copy (H1, description, media) stays on each `solutionStyle`.
 *
 * Document ID `solutionStylePage`, fixed; not creatable from "create new".
 */
export const solutionStylePage = defineType({
  name: 'solutionStylePage',
  title: 'Solution Style Page',
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
      initialValue: 'Solution Style Page',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed products catalog grid on every solution style page. ' +
        'The faceted grid itself is not editable here — rearrange or add bands ' +
        'under the library only.',
    ),
  ],
  preview: {
    prepare() {
      return {
        title: 'Solution Style Page',
        subtitle: 'Solution style catalog template',
      }
    },
  },
})
