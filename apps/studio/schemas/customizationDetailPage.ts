import {defineField, defineType} from 'sanity'
import {ComponentIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Customization Detail Page — listable layout version for
 * `/customizations/[category]/[handle]`.
 *
 * Templates are **section stacks** (PROD-3112 · ADR-020 catalog exception):
 * editors arrange CDP overview + band sections; overview Layout
 * (standard / learn-first) is a radio on `customizationOverview`. Benefits &
 * specs stays a separate band. Breadcrumb stays route-owned. Per-option copy
 * stays on each `customizationOption`.
 *
 * Options pick a layout via `customizationOption.template`. Seeded Default id
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
        'Internal Studio label shown when a customization option picks this layout (e.g. "Customization Detail Page — Default").',
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
    defineField({
      name: 'showStickyNav',
      title: 'Show sticky section nav',
      type: 'boolean',
      group: GROUPS.content,
      initialValue: false,
      description:
        'When on, shows the sticky Product styles / Compare / Inspiration bar under the overview. ' +
        'Off by default — turn on when the page has bands that need that bar.',
    }),
    pageSectionsField(
      SECTION_ALLOW.customizationDetail,
      'sections',
      'Section order for option pages that select this layout. Insert one overview ' +
        '(standard or learn-first), then bands (benefits & specs, works with, compare, ' +
        'showcase, FAQs, …). Option copy and media stay on each customization option — ' +
        'www host-inherits them into these sections.',
    ),
  ],
  preview: {
    select: {
      title: 'title',
      sections: 'sections',
      media: 'previewImage',
    },
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
