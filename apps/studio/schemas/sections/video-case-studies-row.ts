import { defineArrayMember, defineField, defineType } from 'sanity'
import { PlayIcon } from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { linkTargetFields } from '../../lib/link-target-fields'
import { maxCurated } from '../../lib/schema-guards'
import { sectionFieldGroups, SECTION_GROUPS } from '../../lib/section-field-groups'
import { sectionHeaderFields } from '../../lib/section-header-fields'
import {
  hideUnlessCustomList,
  sectionListSourceField,
} from '../../lib/section-list-source-fields'

/**
 * Video case studies (ADR-020 · Case studies tab) — portrait cards with optional
 * hover video. Mixed: reference a caseStudy when one exists, or type a card
 * inline (poster, optional hosted video, metric) until the study is seeded.
 *
 * Testimonials stay deferred until the shared `testimonial` doc (PROD-2293)
 * joins the Clients tab.
 */

const videoCaseStudyCardMember = defineArrayMember({
  type: 'object',
  name: 'videoCaseStudyCard',
  title: 'Typed card',
  fields: [
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string',
      description: 'Client / brand name shown on the card.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Poster image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the poster for screen readers.',
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Brand logo',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'video',
      title: 'Hover video',
      type: 'file',
      options: { accept: 'video/*' },
      description: 'Optional muted loop played on hover. Leave blank for a still poster.',
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'object',
      description: 'Where the card goes (usually a case study).',
      fields: linkTargetFields({ requireLinkType: false }),
    }),
    defineField({
      name: 'metric',
      title: 'Metric',
      type: 'object',
      description: 'Optional highlighted outcome in the glass footer.',
      fields: [
        defineField({
          name: 'title',
          title: 'Stat',
          type: 'string',
          description: 'Short figure or outcome label.',
        }),
        defineField({
          name: 'body',
          title: 'Supporting line',
          type: 'text',
          rows: 2,
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'brand', media: 'image' },
    prepare: ({ title, subtitle, media }) => ({
      title: title || 'Typed card',
      subtitle: subtitle ? `${subtitle} · typed` : 'Typed card',
      media,
    }),
  },
})

const videoCaseStudyRefMember = defineArrayMember({
  type: 'reference',
  name: 'videoCaseStudyRef',
  title: 'Case study',
  to: [{ type: 'caseStudy' }],
  options: { disableNew: true },
})

export const videoCaseStudiesRow = defineType({
  name: 'videoCaseStudiesRow',
  title: 'Video case studies',
  type: 'object',
  icon: PlayIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    sectionListSourceField({
      mode: 'page',
      chipLabel: 'Related case studies',
    }),
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Custom cards when List source is Custom. Reference a case study or type inline.',
      of: [videoCaseStudyRefMember, videoCaseStudyCardMember],
      validation: maxCurated(12),
      hidden: hideUnlessCustomList,
    }),
  ],
  preview: {
    select: { title: 'heading', cards: 'cards', listSource: 'listSource' },
    prepare: ({ title, cards, listSource }) => {
      const count = Array.isArray(cards) ? cards.length : 0
      let subtitle = 'Related case studies'
      if (listSource === 'custom') {
        subtitle = count > 0 ? `${count} card(s)` : 'Custom (empty)'
      }
      return {
        title: title || 'Video case studies',
        subtitle,
      }
    },
  },
  components: { preview: SectionItemPreview },
})
