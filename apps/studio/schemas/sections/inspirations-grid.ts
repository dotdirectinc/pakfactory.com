import { defineArrayMember, defineField, defineType } from 'sanity'
import { ImagesIcon } from '@sanity/icons'
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
 * Inspiration gallery (ADR-020) — Solutions tab; mixed ref | typed cards.
 * Prefer referencing a catalogue doc (solutionStyle first; productStyle /
 * product when the tile *is* that entity). Type inline only when the tile
 * will not be reused elsewhere.
 */

const inspirationsCardMember = defineArrayMember({
  type: 'object',
  name: 'inspirationsCard',
  title: 'Typed card',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the image for screen readers and SEO.',
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'object',
      description: 'Where the card goes. Internal references survive slug changes.',
      fields: linkTargetFields({ requireLinkType: false }),
    }),
  ],
  preview: {
    select: { title: 'title', media: 'image' },
    prepare: ({ title, media }) => ({
      title: title || 'Typed card',
      subtitle: 'Typed — migrate to a catalogue ref when the entity exists',
      media,
    }),
  },
})

const inspirationsRefMember = defineArrayMember({
  type: 'reference',
  name: 'inspirationsRef',
  title: 'Catalogue item',
  to: [
    { type: 'solutionStyle' },
    { type: 'productStyle' },
    { type: 'product' },
  ],
  options: { disableNew: true },
})

export const inspirationsGrid = defineType({
  name: 'inspirationsGrid',
  title: 'Inspiration gallery',
  type: 'object',
  icon: ImagesIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    sectionListSourceField({
      mode: 'page',
      chipLabel: 'Related styles',
    }),
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Custom cards when List source is Custom. Prefer catalogue refs (solutionStyle first).',
      of: [inspirationsRefMember, inspirationsCardMember],
      validation: maxCurated(12),
      hidden: hideUnlessCustomList,
    }),
  ],
  preview: {
    select: { title: 'heading', cards: 'cards', listSource: 'listSource' },
    prepare: ({ title, cards, listSource }) => {
      const count = Array.isArray(cards) ? cards.length : 0
      let subtitle = 'Related styles'
      if (listSource === 'custom') {
        subtitle = count > 0 ? `${count} card(s)` : 'Custom (empty)'
      } else if (listSource === 'page' || !listSource) {
        subtitle = 'Related styles'
      }
      return {
        title: title || 'Inspiration gallery',
        subtitle,
      }
    },
  },
  components: { preview: SectionItemPreview },
})
