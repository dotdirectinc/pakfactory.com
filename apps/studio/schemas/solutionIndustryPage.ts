import {defineField, defineType} from 'sanity'
import {BulbOutlineIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Solution Industry Page — listable layout version for industry Solution LPs.
 *
 * Owns section **order + default chrome** for every `solution` with
 * `solutionType: 'industry'` that points at this doc via `solution.template`.
 * Per-page band content (logos, inspirations, FAQs, …) stays on the solution.
 * Editors can create multiple versions (Default, Use case, Eco, … later);
 * solutions pick one on the Template tab. Optional `previewImage` is Studio
 * chrome only.
 *
 * Seeded Default id `solutionIndustryPage` keeps existing solution refs working.
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
      description:
        'Internal Studio label shown when a solution picks this layout (e.g. "Default").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this solution LP layout. Shown in the Solution Industry Pages list and ' +
        'when a solution picks this template. Leave empty to use the default icon. Not shown on the site.',
    }),
    pageSectionsField(
      SECTION_ALLOW.marketPage,
      'sections',
      'Section order and default headings for industry solutions that select this layout. ' +
        'Rearrange here — every solution pointed at this document reflects the new order. ' +
        'Band content (logos, cards, FAQs) is authored on each solution, matched by section key. ' +
        'Need a different arrangement (e.g. Use case, Eco)? Create another Solution Industry ' +
        'Page layout and point that solution at it.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled solution industry page',
        subtitle: `Industry LP layout · ${count} section(s)`,
        media: media || BulbOutlineIcon,
      }
    },
  },
})
