import {defineField, defineType} from 'sanity'
import {ComponentIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Customization Compatibility Page — listable layout docs for
 * `/customizations/compatibility` (PROD-2921).
 *
 * www serves the **Default** fixed id `customizationCompatibilityPage` only.
 * The heading and prefiltered product grid are route-owned; `sections` render
 * **below** that grid. H1 / SEO stay hardcoded on the www route.
 *
 * Optional `previewImage` is Studio chrome only.
 */
export const customizationCompatibilityPage = defineType({
  name: 'customizationCompatibilityPage',
  title: 'Customization Compatibility Page',
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
        'Internal Studio label (e.g. "Default"). Only the Default id is live on /customizations/compatibility today.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this compatibility layout. Shown in the Customization Compatibility Pages list. ' +
        'Leave empty to use the default icon. Not shown on the site.',
    }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed products catalog grid on /customizations/compatibility (Default id live). ' +
        'The faceted grid itself is not editable here — rearrange or add bands under the library only.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled customization compatibility page',
        subtitle: `Compatibility catalog · ${count} section(s)`,
        media: media || ComponentIcon,
      }
    },
  },
})
