import { defineField, defineType } from 'sanity'
import { DownloadIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { uniqueSlugAcross } from '../lib/slug-rules'

/**
 * Dieline — a downloadable dieline, the flat cut-and-fold layout for one
 * construction (Entities/Dieline.md). A file with a title, a description and a
 * subject. One file per document; the subject (`relatedTo`) drives which pages
 * surface it and the filter inside the listing — pages derive their dielines,
 * they don't list them.
 *
 * Renamed from "Download" and `kind` deliberately dropped: only one form is left,
 * so an enum would be a decision nobody made dressed up as data. A second
 * downloadable form later needs its own type or a rename back to `download`.
 */
export const dieline = defineType({
  name: 'dieline',
  title: 'Dieline',
  type: 'document',
  icon: DownloadIcon,
  groups: groupsFor(['content', 'categorization', 'seo', 'social']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Card and listing title — name the construction ("Hang Tag Dieline").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /resources/dielines/<slug> segment.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['dieline'])),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: 'Short copy for the card and the listing.',
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      group: GROUPS.content,
      description: 'The dieline itself — one file per document.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      // Renamed from `gated` (D33) — a boolean reads as a question. 0 documents of
      // this type exist at the rename, so there is nothing to migrate.
      name: 'isGated',
      title: 'Gated',
      type: 'boolean',
      group: GROUPS.content,
      description:
        'On requires an email before download — and decides whether the file URL can be public. A modelling fact, not a design detail.',
      initialValue: false,
    }),

    // ── Categorization ────────────────────────────────────────────────────────
    defineField({
      name: 'relatedTo',
      title: 'Related to',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'What the dieline is about — drives which pages surface it and the filter inside the listing. The Expertise pages are the biggest win: a dieline on the Prototyping page is a reason to be there.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productStyle' },
            { type: 'productLine' },
            { type: 'expertiseStage' },
            { type: 'solution' },
          ],
        },
      ],
    }),

    ...seoFields({ group: GROUPS.seo, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'title', gated: 'gated', subtitle: 'slug.current' },
    prepare({ title, gated, subtitle }) {
      const tag = gated ? 'Gated' : 'Open'
      return {
        title: title || 'Untitled dieline',
        subtitle: [subtitle ? `/resources/dielines/${subtitle}` : '', tag].filter(Boolean).join(' · '),
      }
    },
  },
})
