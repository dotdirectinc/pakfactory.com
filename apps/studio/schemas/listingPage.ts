import { defineField, defineType } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { pageSectionsField, SECTION_ALLOW } from './sections'

/**
 * Listing Page — the page that fronts a collection (Entities/Listing Page.md).
 * Ten pages, one shape, pinned by semantic ID: bundlesPage ·
 * solutionsPage · expertisePage · caseStudiesPage · resourcesPage · guidesPage ·
 * dielinesPage · glossaryPage · helpPage. Product and customization indexes use
 * dedicated types (`productCatalogPage`, `customizationCatalogPage` — PROD-2589),
 * not this shared listing type. What differs between listing pages is which
 * collection they query — keyed off the document ID and route, never a `pageRole`
 * enum (that was the blogPage.pageRole mistake). No slug: the ID is the route.
 *
 * `featured` is one polymorphic array, not ten typed ones — the field that makes a
 * single type serve ten pages. The picker is scoped by route on the front end.
 * `sections` lands with the shared section inventory (PROD-2292 pt 2).
 */
export const listingPage = defineType({
  name: 'listingPage',
  title: 'Listing Page',
  type: 'document',
  icon: ThLargeIcon,
  groups: groupsFor(['content', 'categorization', 'sections', 'seo', 'social']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Internal Studio label.',
      validation: (Rule) => Rule.required(),
    }),

    // ─── CATEGORIZATION (what it pins + how it filters) ───────────────────────
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Pins chosen items to the top of the listing grid, in this order. Empty leaves the grid ' +
        'in its natural order. Different from a curated row section, which sits around the ' +
        'listing rather than in it.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productLine' },
            { type: 'productStyle' },
            { type: 'product' },
            { type: 'bundle' },
            { type: 'solution' },
            { type: 'expertiseStage' },
            { type: 'caseStudy' },
            { type: 'guide' },
            { type: 'dieline' },
            { type: 'glossaryTerm' },
            { type: 'helpCategory' },
          ],
        },
      ],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'filters',
      title: 'Filters',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Which properties filter this listing, in display order. Leave it empty and every ' +
        'property in use appears, alphabetically. Fill it only to change the order, trim the ' +
        'list, or rename one. The values inside each filter always come from the content.',
      of: [
        {
          type: 'object',
          name: 'listingFilter',
          fields: [
            defineField({
              name: 'property',
              title: 'Property',
              type: 'reference',
              to: [{ type: 'property' }],
              options: { disableNew: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Optional override for the filter’s heading. Blank uses the property’s own title.',
            }),
          ],
          preview: {
            select: { title: 'label', property: 'property.title' },
            prepare({ title, property }) {
              return { title: title || property || 'Filter' }
            },
          },
        },
      ],
    }),

    // The collection row (route-scoped), FAQs, Quote CTA, rich text.
    pageSectionsField(SECTION_ALLOW.listing),

    ...seoFields({ group: GROUPS.seo, canonical: true, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'title', featured: 'featured' },
    prepare({ title, featured }) {
      const n = Array.isArray(featured) ? featured.length : 0
      return { title: title || 'Listing page', subtitle: n ? `${n} pinned` : 'Listing page' }
    },
  },
})
