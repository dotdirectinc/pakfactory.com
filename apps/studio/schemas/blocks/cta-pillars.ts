import { defineArrayMember, defineField, defineType } from 'sanity'
import { ComponentIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview';

/**
 * ctaPillars — a promo band of "pillar" cards linking out to key destinations
 * (capabilities, resources, case studies). Page-builder block
 * (apps/blog components/blocks/cta-pillars).
 */
export const ctaPillars = defineType({
  name: 'ctaPillars',
  title: 'CTA — Pillars',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({
      name: 'pillars',
      title: 'Pillars',
      type: 'array',
      description: 'Promo cards shown in a row, in display order.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'pillar',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 2,
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'href',
              title: 'Link URL',
              type: 'url',
              validation: (Rule) =>
                Rule.required().uri({ allowRelative: true, scheme: ['http', 'https'] }),
            }),
            defineField({
              name: 'ctaLabel',
              title: 'Link label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'href' },
          },
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { count: 'pillars.length', first: 'pillars.0.title' },
    prepare({ count, first }) {
      return {
        title: 'CTA — Pillars',
        subtitle: count ? `${count} pillar${count === 1 ? '' : 's'}${first ? ` · ${first}…` : ''}` : 'No pillars',
      }
    },
  },
  components: { preview: BlockItemPreview },
})
