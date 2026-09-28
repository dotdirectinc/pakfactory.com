import {defineField, defineType} from 'sanity'
import {ComponentIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {filtersField} from '../lib/filters-field'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Customization Catalog Page — listable layout docs for `/customizations`
 * (PROD-2589).
 *
 * www still serves the **Default** fixed id `customizationCatalogPage` only.
 * Extra layouts are prep/draft until a settings “active layout” pointer exists.
 * The faceted customizations grid is route-owned; `sections` render **below**
 * that grid. H1 / intro / SEO stay hardcoded on the www route in this pass.
 * `customizationsCatalog` is not allowlisted here (would nest a second library).
 *
 * Optional `previewImage` is Studio chrome only.
 */
export const customizationCatalogPage = defineType({
  name: 'customizationCatalogPage',
  title: 'Customization Catalog Page',
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
        'Internal Studio label (e.g. "Default"). Only the Default id is live on /customizations today.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this catalog layout. Shown in the Customization Catalog Pages list. ' +
        'Leave empty to use the default icon. Not shown on the site.',
    }),
    filtersField({ group: GROUPS.content, declaredBy: 'customizationType' }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed customizations catalog grid on /customizations (Default id live). ' +
        'The faceted grid itself is not editable here — rearrange or add bands ' +
        'under the library only.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled customization catalog page',
        subtitle: `Customizations catalog · ${count} section(s)`,
        media: media || ComponentIcon,
      }
    },
  },
})
