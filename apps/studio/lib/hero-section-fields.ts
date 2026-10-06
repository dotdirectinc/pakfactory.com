import { defineArrayMember, defineField } from 'sanity'
import { SECTION_GROUPS } from './section-field-groups'
import { sectionLinkTargetFields } from './section-link-target-fields'

/**
 * Shared fields for the Home hero sections (PROD-2666 · ADR-020).
 *
 * A hero is the one place the headline, the two page CTAs and the review
 * proof live, so these fields replace `sectionHeaderFields()` (no align /
 * padding / dieline toggles — the hero layout is fixed in React, D35).
 * Layout is chosen by *which* hero section an editor inserts, never by a field.
 */

const CTA_NOTE_HELP =
  'Optional short line under the button (e.g. "Custom sizes, print and finishes").'

/** One hero button: label + one-line note + Internal / Site path / External target. */
export function heroCtaField(name: string, title: string, description: string) {
  return defineField({
    name,
    title,
    type: 'object',
    group: SECTION_GROUPS.heading,
    description,
    options: { collapsible: true, collapsed: false },
    fields: [
      defineField({
        name: 'label',
        title: 'Button label',
        type: 'string',
        description: 'Leave empty for no button.',
      }),
      defineField({
        name: 'note',
        title: 'Note under the button',
        type: 'string',
        description: CTA_NOTE_HELP,
        validation: (Rule) => Rule.max(60),
      }),
      ...sectionLinkTargetFields(),
    ],
  })
}

/** Label above the headline — same editor language as section chrome. */
export function heroEyebrowField() {
  return defineField({
    name: 'eyebrow',
    title: 'Label above heading',
    type: 'string',
    group: SECTION_GROUPS.heading,
    description: 'Short line above the headline (e.g. "Custom packaging manufacturer"). Leave blank for none.',
  })
}

export function heroIntroField() {
  return defineField({
    name: 'intro',
    title: 'Intro',
    type: 'text',
    rows: 2,
    group: SECTION_GROUPS.heading,
    description: 'One supporting line under the headline.',
    validation: (Rule) => Rule.max(200),
  })
}

/** Primary + secondary CTA pair. Primary defaults to the quote path. */
export function heroCtaFields() {
  return [
    heroCtaField(
      'primaryCta',
      'Primary button',
      'The main action — usually the quote request.',
    ),
    heroCtaField(
      'secondaryCta',
      'Secondary button',
      'Optional second path — usually browsing products.',
    ),
  ]
}

/** Review proof under the CTAs — rating comes live from Google on www. */
export function heroShowReviewsField() {
  return defineField({
    name: 'showReviews',
    title: 'Show Google rating',
    type: 'boolean',
    group: SECTION_GROUPS.content,
    initialValue: true,
    description: 'Shows the live Google review score under the buttons.',
  })
}

const RAIL_CATALOGUE_TYPES = [
  {type: 'productLine'},
  {type: 'solution'},
  {type: 'expertiseStage'},
  {type: 'customizationType'},
  {type: 'caseStudy'},
  {type: 'post'},
] as const

/**
 * One General-deck bucket item for simple Finder — catalogue ref plus optional
 * feature image/video (falls back to the document’s featured media on www).
 */
function heroFinderGeneralBucketItemFields(to: {type: string}[], filter?: string) {
  return [
    defineField({
      name: 'item',
      title: 'Document',
      type: 'reference',
      to,
      options: {
        disableNew: true,
        ...(filter ? {filter} : {}),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featureImage',
      title: 'Feature image',
      type: 'image',
      options: {hotspot: true},
      description:
        'Optional card image. Leave empty to use the document’s featured / card image.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'featureVideo',
      title: 'Feature video',
      type: 'featuredVideo',
      description:
        'Optional ambient MP4 (upload or URL). YouTube is stored but the still is used for hover playback.',
    }),
  ]
}

function heroFinderGeneralBucketField({
  name,
  title,
  description,
  to,
  filter,
  kindLabel,
}: {
  name: string
  title: string
  description: string
  to: {type: string}[]
  filter?: string
  kindLabel: string
}) {
  return defineField({
    name,
    title,
    type: 'array',
    group: SECTION_GROUPS.content,
    description,
    of: [
      defineArrayMember({
        type: 'object',
        name: 'finderGeneralItem',
        title: kindLabel,
        fields: heroFinderGeneralBucketItemFields(to, filter),
        preview: {
          select: {
            title: 'item.title',
            shortName: 'item.shortName',
            media: 'featureImage',
            fallback: 'item.featuredImage',
            card: 'item.cardImage',
          },
          prepare({title, shortName, media, fallback, card}) {
            return {
              title: shortName || title || kindLabel,
              subtitle: kindLabel,
              media: media || fallback || card,
            }
          },
        },
      }),
    ],
    validation: (Rule) => Rule.max(3),
  })
}

/**
 * Simple Finder General deck (Packaging Solution × All) — five typed buckets,
 * max 3 each, plus rail order. Specific picks use relatedness rules on www.
 */
export function heroFinderGeneralRailFields() {
  return [
    defineField({
      name: 'railOrder',
      title: 'General rail order',
      type: 'string',
      group: SECTION_GROUPS.content,
      options: {
        list: [
          {title: 'Business priorities (array order)', value: 'business'},
          {title: 'Random within each category', value: 'random'},
        ],
        layout: 'radio',
      },
      initialValue: 'business',
      description:
        'How items are ordered inside each General category when both pickers are defaults. Specific picks keep stable relatedness order.',
    }),
    heroFinderGeneralBucketField({
      name: 'generalProducts',
      title: 'General — Products',
      kindLabel: 'Product',
      description:
        'Up to 3 product lines for Packaging Solution × All. Shown first in the media rail.',
      to: [{type: 'productLine'}],
      // Mirrors LINE_STYLE_ACTIVE (packages/sanity/src/queries/catalog.ts) — a hero slide
      // is a LINK, so the target needs a page as well as a listing. Unset is omitted:
      // a picker that offers a line with no authored status would author a dead link
      // after the development dataset migration.
      filter: 'status == "active"',
    }),
    heroFinderGeneralBucketField({
      name: 'generalIndustries',
      title: 'General — Industries',
      kindLabel: 'Industry',
      description: 'Up to 3 industries (solutions with a page) for the default rail.',
      to: [{type: 'solution'}],
      // Mirrors SOLUTION_ACTIVE — Active only, and no unset arm (PROD-2845).
      filter: 'status == "active"',
    }),
    heroFinderGeneralBucketField({
      name: 'generalCustomizations',
      title: 'General — Customizations',
      kindLabel: 'Customization',
      description: 'Up to 3 customization types for the default rail.',
      to: [{type: 'customizationType'}],
    }),
    heroFinderGeneralBucketField({
      name: 'generalExpertise',
      title: 'General — Expertise',
      kindLabel: 'Expertise',
      description:
        'Up to 3 expertise stages. Also used when the visitor picks a specific line or industry.',
      to: [{type: 'expertiseStage'}],
    }),
    heroFinderGeneralBucketField({
      name: 'generalCaseStudies',
      title: 'General — Case studies',
      kindLabel: 'Case study',
      description: 'Up to 3 case studies for Packaging Solution × All.',
      to: [{type: 'caseStudy'}],
    }),
  ]
}

/**
 * Default rail for Finder fullscreen when both pickers are sentinels
 * (Packaging Solution × All). Editor-ordered flexible items — not fixed seats.
 */
export function heroFinderDefaultRailField() {
  return defineField({
    name: 'defaultRail',
    title: 'Default rail (Packaging Solution × All)',
    type: 'array',
    group: SECTION_GROUPS.content,
    description:
      'Used only when both pickers are defaults. Add items in display order: each has a rail label, a catalogue document or manual campaign, and banner media (image or video) for the fullscreen background. Specific line/industry picks use automatic matching — not this list.',
    of: [
      defineArrayMember({
        type: 'object',
        name: 'finderRailItem',
        title: 'Rail item',
        fields: [
          defineField({
            name: 'kindLabel',
            title: 'Rail label',
            type: 'string',
            description: 'Short category text on the rail (e.g. Product, Blog, Launch).',
            validation: (Rule) => Rule.required().max(40),
          }),
          defineField({
            name: 'source',
            title: 'Content source',
            type: 'string',
            options: {
              list: [
                {title: 'Catalogue document', value: 'catalogue'},
                {title: 'Manual campaign', value: 'campaign'},
              ],
              layout: 'radio',
            },
            initialValue: 'catalogue',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'item',
            title: 'Document',
            type: 'reference',
            to: [...RAIL_CATALOGUE_TYPES],
            options: {disableNew: true},
            hidden: ({parent}) => parent?.source !== 'catalogue',
            description: 'Product, solution, expertise, customization, case study, or blog post.',
            validation: (Rule) =>
              Rule.custom((value, context) => {
                const parent = context.parent as {source?: string} | undefined
                if (parent?.source === 'catalogue' && !value) {
                  return 'Pick a catalogue document, or switch to Manual campaign.'
                }
                return true
              }),
          }),
          defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            description:
              'Card title. Required for manual campaigns; optional override when using a catalogue document.',
            validation: (Rule) =>
              Rule.max(80).custom((value, context) => {
                const parent = context.parent as {source?: string} | undefined
                if (parent?.source === 'campaign' && !value?.trim()) {
                  return 'Title is required for a manual campaign.'
                }
                return true
              }),
          }),
          defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            rows: 2,
            description: 'Optional card body. Overrides catalogue summary when set.',
            validation: (Rule) => Rule.max(160),
          }),
          defineField({
            name: 'link',
            title: 'Link',
            type: 'object',
            description:
              'Optional CTA. For catalogue items, leave empty to use the document’s default page.',
            fields: [
              defineField({
                name: 'label',
                title: 'Link label',
                type: 'string',
              }),
              ...sectionLinkTargetFields(),
            ],
          }),
          defineField({
            name: 'bannerType',
            title: 'Banner media',
            type: 'string',
            options: {
              list: [
                {title: 'Image', value: 'image'},
                {title: 'Video', value: 'video'},
              ],
              layout: 'radio',
            },
            initialValue: 'image',
            description:
              'Fullscreen background when this item is active. Catalogue items fall back to the document image if banner media is empty.',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'bannerImage',
            title: 'Banner image',
            type: 'image',
            options: {hotspot: true},
            hidden: ({parent}) => parent?.bannerType !== 'image',
            fields: [
              defineField({
                name: 'alt',
                title: 'Alt text',
                type: 'string',
              }),
            ],
          }),
          defineField({
            name: 'bannerVideo',
            title: 'Banner video',
            type: 'featuredVideo',
            hidden: ({parent}) => parent?.bannerType !== 'video',
            description:
              'Upload or CDN URL play as a muted looping background. YouTube is stored but the still image is used for ambient playback.',
          }),
        ],
        preview: {
          select: {
            kindLabel: 'kindLabel',
            title: 'title',
            source: 'source',
            media: 'bannerImage',
          },
          prepare({kindLabel, title, source, media}) {
            return {
              title: kindLabel || 'Rail item',
              subtitle:
                title ||
                (source === 'campaign' ? 'Manual campaign' : 'Catalogue document'),
              media,
            }
          },
        },
      }),
    ],
    validation: (Rule) => Rule.min(1).max(12),
  })
}

/**
 * Spotlight items — what rotates beside (or behind) the fixed headline.
 * Mixed array (ADR-020 §7): pick a catalogue document, or add a free-form
 * campaign slide for launches and notices that have no document of their own.
 */
export function heroSpotlightField() {
  return defineField({
    name: 'spotlight',
    title: 'Spotlight',
    type: 'array',
    group: SECTION_GROUPS.content,
    description:
      'One to five slides, in display order. Pick a case study, product line, product style or industry — the image, title and link come from that document. Use Campaign for anything without a page of its own.',
    of: [
      defineArrayMember({
        type: 'reference',
        name: 'spotlightRef',
        title: 'Catalogue item',
        to: [
          { type: 'caseStudy' },
          { type: 'productLine' },
          { type: 'productStyle' },
          { type: 'solution' },
        ],
        options: { disableNew: true },
      }),
      defineArrayMember({
        type: 'object',
        name: 'heroSpotlightCampaign',
        title: 'Campaign',
        fields: [
          defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            validation: (Rule) => Rule.required().max(80),
          }),
          defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            rows: 2,
            validation: (Rule) => Rule.max(160),
          }),
          defineField({
            name: 'image',
            title: 'Image',
            type: 'image',
            options: { hotspot: true },
            validation: (Rule) => Rule.required(),
            fields: [
              defineField({
                name: 'alt',
                title: 'Alt text',
                type: 'string',
                description: 'Describes the image for screen readers and SEO.',
              }),
            ],
          }),
          defineField({
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'label',
                title: 'Link label',
                type: 'string',
                description: 'e.g. "See our approach". Leave empty for no link.',
              }),
              ...sectionLinkTargetFields(),
            ],
          }),
        ],
        preview: {
          select: { title: 'title', subtitle: 'description', media: 'image' },
          prepare: ({ title, subtitle, media }) => ({
            title: title || 'Campaign',
            subtitle: subtitle ? `Campaign · ${subtitle}` : 'Campaign',
            media,
          }),
        },
      }),
    ],
    validation: (Rule) => Rule.required().min(1).max(5),
  })
}
