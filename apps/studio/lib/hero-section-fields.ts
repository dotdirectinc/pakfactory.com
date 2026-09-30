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
