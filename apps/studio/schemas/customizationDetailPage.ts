import {defineField, defineType} from 'sanity'
import {ComponentIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Customization Detail Page — listable layout version for shared bands under
 * `/customizations/[category]/[handle]` detail pages.
 *
 * Hero / gallery / peer chrome stay route-owned; `sections` render **below**
 * that chrome. Per-option copy stays on each `customizationOption`. Options
 * pick a layout via `customizationOption.template`. Seeded Default id
 * `customizationDetailPage` keeps unpublished picks working (www fallback).
 *
 * Optional `previewImage` is Studio chrome only (list + Template picker).
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
      description:
        'Internal Studio label shown when a customization option picks this layout (e.g. "Default").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this detail layout. Shown in the Customization Detail Pages list and when an ' +
        'option picks this template. Leave empty to use the default icon. Not shown on the site.',
    }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed customization detail chrome on option pages that select this layout. ' +
        'The overview itself is not editable here — rearrange or add bands under the detail only.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled customization detail page',
        subtitle: `Detail layout · ${count} section(s)`,
        media: media || ComponentIcon,
      }
    },
  },
})
