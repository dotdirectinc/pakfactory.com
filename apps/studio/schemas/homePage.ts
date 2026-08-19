import { defineField, defineType } from 'sanity'
import { HomeIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'

/**
 * Home Page — the site's front door, the one page that argues across every area
 * (Entities/Home Page.md). A singleton, and the only one: its shape is unique, so
 * it doesn't share a type with /about (a home-only section would otherwise appear
 * in the picker on every company page). Document ID `homePage`, fixed; not
 * creatable from "create new".
 *
 * ⚠️ The `sections` array is THIS PAGE — every area's sections are available here.
 * It lands with the shared section inventory (PROD-2292 pt 2). No slug: the ID is
 * the route (/). No presentation fields on its sections.
 *
 * 🔴 The homepage has no design yet; this type is the container, not the content.
 * It replaces the deployed `page-home` document (deleted last, once this exists).
 */
export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  icon: HomeIcon,
  groups: groupsFor(['content', 'seo', 'social']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Internal Studio label. The visible headline is a section’s job.',
      validation: (Rule) => Rule.required(),
    }),
    // `sections` (the page itself) lands with the shared section inventory — PROD-2292 pt 2.
    ...seoFields({ group: GROUPS.seo, canonical: true, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    prepare() {
      return { title: 'Home Page', subtitle: '/' }
    },
  },
})
