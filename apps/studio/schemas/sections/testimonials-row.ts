import { defineField, defineType } from 'sanity'
import { CommentIcon } from '@sanity/icons'
import { DefaultCarouselLayoutInput } from '../../components/DefaultCarouselLayoutInput'
import { SectionGoogleReviewsNoticeInput } from '../../components/SectionGoogleReviewsNoticeInput'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import {
  sectionFieldGroups,
  SECTION_GROUPS,
} from '../../lib/section-field-groups'
import { sectionHeaderFields } from '../../lib/section-header-fields'

/**
 * Reviews — Layout-family carousel of buyer testimonials (ADR-020).
 * Chrome only in Studio; www loads 4–5★ Google Places reviews
 * (PROD-2587 — shared 24h Place-ID cache, not curated CMS items).
 * Heading link → Google reviews (or CMS Section link overrides).
 */
export const testimonialsRow = defineType({
  name: 'testimonialsRow',
  title: 'Reviews',
  type: 'object',
  icon: CommentIcon,
  groups: sectionFieldGroups(),
  initialValue: {
    layoutVariant: 'carousel',
    aggregatePlacement: 'footer',
  },
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'googleReviewsNote',
      title: 'Review cards',
      type: 'string',
      readOnly: true,
      group: SECTION_GROUPS.content,
      description:
        'Informational only — cards are not edited in Studio.',
      components: {input: SectionGoogleReviewsNoticeInput},
    }),
    defineField({
      name: 'layoutVariant',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Carousel (arrows)', value: 'carousel'},
          {title: 'Marquee (auto dual-row)', value: 'marquee'},
        ],
        layout: 'radio',
      },
      initialValue: 'carousel',
      group: SECTION_GROUPS.content,
      description:
        'Marquee: two auto-scrolling rows at different speeds; pause control only (no arrows).',
      components: {input: DefaultCarouselLayoutInput},
    }),
    defineField({
      name: 'aggregatePlacement',
      title: 'Rating summary',
      type: 'string',
      options: {
        list: [
          {title: 'Under reviews (footer)', value: 'footer'},
          {title: 'Replace eyebrow', value: 'eyebrow'},
        ],
        layout: 'radio',
      },
      initialValue: 'footer',
      group: SECTION_GROUPS.content,
      description:
        'Google Customer Reviews score + stars. “Replace eyebrow” swaps the section kicker (e.g. [ Reviews ]) for the aggregate.',
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({
      title: title || 'Reviews',
      subtitle: 'Live Google reviews (4–5★)',
    }),
  },
  components: { preview: SectionItemPreview },
})
