import {defineField, defineType} from 'sanity'
import {ThLargeIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {filtersField} from '../lib/filters-field'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Solution Style Page — listable layout version for shared bands under
 * `/solutions/[solution]/[style]` catalogs.
 *
 * The faceted product grid is route-owned; `sections` render **below** that
 * grid. Per-style copy (H1, description, media) stays on each `solutionStyle`.
 * Styles pick a layout via `solutionStyle.template`. Seeded Default id
 * `solutionStylePage` keeps unpublished picks working (www fallback).
 *
 * Optional `previewImage` is Studio chrome only (list + Template picker).
 */
export const solutionStylePage = defineType({
  name: 'solutionStylePage',
  title: 'Solution Style Page',
  type: 'document',
  icon: ThLargeIcon,
  groups: groupsFor(['content', 'filters', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'Internal Studio label shown when a solution style picks this layout (e.g. "Default").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this style-catalog layout. Shown in the Solution Style Pages list and when a ' +
        'solution style picks this template. Leave empty to use the default icon. Not shown on the site.',
    }),
    filtersField({ group: GROUPS.filters, declaredBy: 'productLine' }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed products catalog grid on solution style pages that select this layout. ' +
        'The faceted grid itself is not editable here — rearrange or add bands under the library only.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled solution style page',
        subtitle: `Style catalog layout · ${count} section(s)`,
        media: media || ThLargeIcon,
      }
    },
  },
})
