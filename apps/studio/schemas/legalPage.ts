import { defineField, defineType } from 'sanity'
import { LockIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'

/**
 * Legal Page — prose with a revision date (Entities/Legal Page.md). Two
 * documents, one type: the privacy policy (`privacyPage`) and the terms of
 * service (`termsPage`), pinned by semantic ID.
 *
 * Deliberately NOT Content Page and deliberately NO `sections` field — a legal
 * page must not grow a hero, a featured band or a "Get a quote" banner. Different
 * shape, different type.
 *
 * `lastUpdated` is the one place the model AUTHORS a date rather than deriving it
 * from `_updatedAt` — a legal revision date is a claim someone is making, and it
 * shouldn't change because a typo was fixed.
 */
export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal Page',
  type: 'document',
  icon: LockIcon,
  groups: groupsFor(['content', 'seo', 'social']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Internal Studio label (e.g. "Privacy Policy").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'date',
      group: GROUPS.content,
      description:
        'Authored, not automatic — a legal revision date is a deliberate statement. Do not change it for a typo fix.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: GROUPS.content,
      description: 'The document — long-form prose.',
      of: [{ type: 'block' }],
    }),
    ...seoFields({ group: GROUPS.seo, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'title', lastUpdated: 'lastUpdated' },
    prepare({ title, lastUpdated }) {
      return { title: title || 'Legal page', subtitle: lastUpdated ? `Updated ${lastUpdated}` : 'No date set' }
    },
  },
})
