import {defineField, defineType} from 'sanity'
import {ComponentIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Customization Catalog Page — singleton for `/customizations` (PROD-2589).
 *
 * Mirrors `solutionIndustryPage`: fixed document id, title + sections only.
 * The faceted customizations grid is route-owned; `sections` render **below**
 * that grid. H1 / intro / SEO stay hardcoded on the www route in this pass.
 * `customizationsCatalog` is not allowlisted here (would nest a second library).
 *
 * Document ID `customizationCatalogPage`, fixed; not creatable from "create new".
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
      description: 'Internal Studio label.',
      initialValue: 'Customization Catalog Page',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.catalogIndex,
      'sections',
      'Sections below the fixed customizations catalog grid on /customizations. ' +
        'The faceted grid itself is not editable here — rearrange or add bands ' +
        'under the library only.',
    ),
  ],
  preview: {
    prepare() {
      return {
        title: 'Customization Catalog Page',
        subtitle: 'Customizations catalog',
      }
    },
  },
})
