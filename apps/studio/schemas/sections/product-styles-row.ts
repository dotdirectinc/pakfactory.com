import {defineArrayMember, defineField, defineType} from 'sanity'
import {ThLargeIcon} from '@sanity/icons'
import {SectionItemPreview} from '../../components/SectionItemPreview'
import {linkTargetFields} from '../../lib/link-target-fields'
import {maxCurated} from '../../lib/schema-guards'
import {sectionFieldGroups, SECTION_GROUPS} from '../../lib/section-field-groups'
import {sectionHeaderFields} from '../../lib/section-header-fields'
import {
  hideUnlessCustomList,
  sectionListSourceField,
} from '../../lib/section-list-source-fields'

/**
 * Product style row (ADR-020) — Products tab; same field shape as
 * `inspirationsGrid`. Prefer referencing a catalogue `productStyle` (or
 * `product` when the tile *is* that entity). Type inline only when the tile
 * will not be reused elsewhere.
 */

const productStylesCardMember = defineArrayMember({
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
      options: {hotspot: true},
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
      description:
        'Where the card goes. Internal references survive slug changes.',
      fields: linkTargetFields({requireLinkType: false, includeSitePath: true}),
    }),
  ],
  preview: {
    select: {title: 'title', media: 'image'},
    prepare: ({title, media}) => ({
      title: title || 'Typed card',
      subtitle: 'Typed — migrate to a catalogue ref when the entity exists',
      media,
    }),
  },
})

const productStylesRefMember = defineArrayMember({
  type: 'reference',
  name: 'inspirationsRef',
  title: 'Catalogue item',
  to: [{type: 'productStyle'}, {type: 'product'}],
  options: {disableNew: true},
})

export const productStylesRow = defineType({
  name: 'productStylesRow',
  title: 'Product style row',
  type: 'object',
  icon: ThLargeIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    sectionListSourceField({
      mode: 'page',
      chipLabel: 'Line styles',
    }),
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Custom cards when List source is Custom. Prefer catalogue refs (productStyle first).',
      of: [productStylesRefMember, productStylesCardMember],
      validation: maxCurated(12),
      hidden: hideUnlessCustomList,
    }),
  ],
  preview: {
    select: {title: 'heading', cards: 'cards', listSource: 'listSource'},
    prepare: ({title, cards, listSource}) => {
      const count = Array.isArray(cards) ? cards.length : 0
      let subtitle = 'Line styles'
      if (listSource === 'custom') {
        subtitle = count > 0 ? `${count} card(s)` : 'Custom (empty)'
      } else if (listSource === 'page' || !listSource) {
        subtitle = 'Line styles'
      }
      return {
        title: title || 'Product style row',
        subtitle,
      }
    },
  },
  components: {preview: SectionItemPreview},
})
