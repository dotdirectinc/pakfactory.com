import { defineArrayMember, defineField, defineType } from 'sanity'
import {
  FilterIcon,
  ImagesIcon,
  SplitVerticalIcon,
  EarthGlobeIcon,
} from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { sectionFieldGroups, SECTION_GROUPS } from '../../lib/section-field-groups'
import {
  heroCtaFields,
  heroEyebrowField,
  heroFinderDefaultRailField,
  heroIntroField,
  heroShowReviewsField,
  heroSpotlightField,
} from '../../lib/hero-section-fields'

/**
 * Home hero sections (PROD-2666 · ADR-020). Home-only — see `SECTION_ALLOW.home`.
 *
 * Layout is the editor's choice of `_type`, never a field (D35). Spotlight /
 * Full-bleed share one field set; Finder and Finder fullscreen share pickers
 * (lines × industries); fullscreen adds a Studio-controlled default rail.
 */

function headlineField() {
  return defineField({
    name: 'heading',
    title: 'Headline',
    type: 'string',
    group: SECTION_GROUPS.heading,
    description: 'The page H1. Stays put while the spotlight changes. Keep it under ~60 characters.',
    validation: (Rule) => Rule.required().max(90),
  })
}

function spotlightPreview(fallback: string) {
  return {
    select: { title: 'heading', spotlight: 'spotlight' },
    prepare: ({ title, spotlight }: { title?: string; spotlight?: unknown[] }) => ({
      title: title || fallback,
      subtitle: `${fallback} · ${Array.isArray(spotlight) ? spotlight.length : 0} slide(s)`,
    }),
  }
}

/** Shared Finder copy + picker fields (simple + fullscreen). */
function finderSharedFields() {
  return [
    heroEyebrowField(),
    defineField({
      name: 'headingLead',
      title: 'Headline — before the product line',
      type: 'string',
      group: SECTION_GROUPS.heading,
      initialValue: 'Custom',
      validation: (Rule) => Rule.required().max(30),
    }),
    defineField({
      name: 'headingJoin',
      title: 'Headline — between the two pickers',
      type: 'string',
      group: SECTION_GROUPS.heading,
      initialValue: 'for',
      validation: (Rule) => Rule.required().max(20),
    }),
    defineField({
      name: 'headingTrail',
      title: 'Headline — after the industry',
      type: 'string',
      group: SECTION_GROUPS.heading,
      initialValue: 'brands.',
      validation: (Rule) => Rule.max(30),
    }),
    heroIntroField(),
    ...heroCtaFields(),
    defineField({
      name: 'productLines',
      title: 'Product lines',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Options for the first picker, in order. Hidden or coming-soon lines are skipped on the site.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'productLine' }],
          options: {
            disableNew: true,
            filter: '(!defined(status) || status == "active") && customerFacing != false',
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(2).max(8).unique(),
    }),
    defineField({
      name: 'industries',
      title: 'Industries',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Options for the second picker, in order. Specific picks match a case study via line × industry rules on www.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'solution' }],
          options: { disableNew: true, filter: 'hasPage == true' },
        }),
      ],
      validation: (Rule) => Rule.required().min(2).max(8).unique(),
    }),
    heroShowReviewsField(),
  ]
}

function finderPreview(label: string) {
  return {
    select: {
      lead: 'headingLead',
      join: 'headingJoin',
      trail: 'headingTrail',
      lines: 'productLines',
      industries: 'industries',
    },
    prepare: ({
      lead,
      join,
      trail,
      lines,
      industries,
    }: {
      lead?: string
      join?: string
      trail?: string
      lines?: unknown[]
      industries?: unknown[]
    }) => ({
      title: [lead, '[line]', join, '[industry]', trail].filter(Boolean).join(' '),
      subtitle: `${label} · ${Array.isArray(lines) ? lines.length : 0} lines × ${
        Array.isArray(industries) ? industries.length : 0
      } industries`,
    }),
  }
}

/** Option A — copy left, rotating spotlight stage right, labelled pager below. */
export const heroSpotlight = defineType({
  name: 'heroSpotlight',
  title: 'Spotlight hero',
  type: 'object',
  icon: SplitVerticalIcon,
  description: 'Headline and buttons on the left; case studies, products or industries rotate on the right.',
  groups: sectionFieldGroups(),
  fields: [
    heroEyebrowField(),
    headlineField(),
    heroIntroField(),
    ...heroCtaFields(),
    heroSpotlightField(),
    heroShowReviewsField(),
  ],
  preview: spotlightPreview('Spotlight hero'),
  components: { preview: SectionItemPreview },
})

/** Option B — the active spotlight fills the band; copy sits over it. */
export const heroSpotlightFullBleed = defineType({
  name: 'heroSpotlightFullBleed',
  title: 'Full-bleed hero',
  type: 'object',
  icon: ImagesIcon,
  description: 'The spotlight image fills the hero with the headline over it. Same content as Spotlight hero.',
  groups: sectionFieldGroups(),
  fields: [
    heroEyebrowField(),
    headlineField(),
    heroIntroField(),
    ...heroCtaFields(),
    heroSpotlightField(),
    heroShowReviewsField(),
  ],
  preview: spotlightPreview('Full-bleed hero'),
  components: { preview: SectionItemPreview },
})

/**
 * Option C — simple Finder: "Custom [line] for [industry] brands." with a
 * MediaCaptionCard rail (derived pairing on www).
 */
export const heroFinder = defineType({
  name: 'heroFinder',
  title: 'Finder hero',
  type: 'object',
  icon: FilterIcon,
  description:
    'Headline sentence with a product-line and an industry picker. Shows the picked line and a matching case study.',
  groups: sectionFieldGroups(),
  fields: finderSharedFields(),
  preview: finderPreview('Finder hero'),
  components: { preview: SectionItemPreview },
})

/**
 * Option D — Finder fullscreen: same pickers; active slide as 100svh background;
 * push-dock category rail. Default rail seats are Studio-filled; specific picks
 * use rules on www.
 */
export const heroFinderFullscreen = defineType({
  name: 'heroFinderFullscreen',
  title: 'Finder fullscreen hero',
  type: 'object',
  icon: EarthGlobeIcon,
  description:
    'Fullscreen Finder: active result fills the viewport; category labels push into a detail card. Default Packaging Solution × All rail is curated below; specific picks are automatic.',
  groups: sectionFieldGroups(),
  fields: [...finderSharedFields(), heroFinderDefaultRailField()],
  preview: finderPreview('Finder fullscreen'),
  components: { preview: SectionItemPreview },
})

export const heroSections = [
  heroSpotlight,
  heroSpotlightFullBleed,
  heroFinder,
  heroFinderFullscreen,
]
