import {defineField, defineType} from 'sanity'
import {BulbOutlineIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Solution Industry Page — singleton template for industry Solution LPs.
 *
 * Owns section **order + default chrome** for every `solution` with
 * `solutionType: 'industry'` that points at this doc via `solution.template`.
 * Per-page band content (logos, inspirations, FAQs, …) stays on the solution.
 *
 * Document ID `solutionIndustryPage`, fixed; not creatable from "create new".
 * No public URL / SEO — it is a layout template, not a routable page.
 */
export const solutionIndustryPage = defineType({
  name: 'solutionIndustryPage',
  title: 'Solution Industry Page',
  type: 'document',
  icon: BulbOutlineIcon,
  groups: groupsFor(['content', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Internal Studio label.',
      initialValue: 'Solution Industry Page',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.marketPage,
      'sections',
      'Section order and default headings for industry Solution landing pages. ' +
        'Rearrange here once — every industry solution that selects this template ' +
        'reflects the new order. Band content (logos, cards, FAQs) is authored on ' +
        'each solution document, matched by section key.',
    ),
  ],
  preview: {
    prepare() {
      return {
        title: 'Solution Industry Page',
        subtitle: 'Industry LP template',
      }
    },
  },
})
