import {defineField, defineType} from 'sanity'
import {BellIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Newsroom Catalog Page — listable layout docs for `/newsroom` (PROD-2909).
 *
 * A dedicated type rather than the shared `listingPage`, because more than one
 * layout version and a faceted grid are both on the table. Same shape as
 * `productCatalogPage` / `customizationCatalogPage`, minus the Filters tab:
 * `filtersField` offers **Property** documents, and press releases have no
 * properties — the year and category filters are route-owned.
 *
 * Only the Default fixed id is live until a settings "active layout" pointer
 * exists, same as Products. Optional `previewImage` is Studio chrome only.
 */
export const newsroomCatalogPage = defineType({
  name: 'newsroomCatalogPage',
  title: 'Newsroom Catalog Page',
  type: 'document',
  icon: BellIcon,
  groups: groupsFor(['content', 'categorization', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'Internal Studio label for this layout (e.g. "Default"). Not shown on the site.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this layout, shown in the Newsroom Catalog Pages list so layouts can ' +
        'be told apart. Leave empty to use the default icon. Not shown on the site.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured releases',
      type: 'array',
      group: GROUPS.categorization,
      of: [{type: 'reference', to: [{type: 'pressRelease'}]}],
      description:
        'Pins chosen releases to the top of the newsroom list, in this order. Leave empty to ' +
        'show everything newest-first.',
    }),
    pageSectionsField(
      SECTION_ALLOW.newsroomIndex,
      'sections',
      'Sections that render below the newsroom list. The list itself is not editable here.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled newsroom catalog page',
        subtitle: `Newsroom listing · ${count} section(s)`,
        media: media || BellIcon,
      }
    },
  },
})
