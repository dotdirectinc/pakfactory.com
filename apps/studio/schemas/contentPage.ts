import { defineField, defineType } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { pageSectionsField, SECTION_ALLOW } from './sections'

/**
 * Content Page — a standing page that isn't a listing and isn't the homepage:
 * About, Contact, search results, 404 (Entities/Content Page.md). These differ in
 * content, not in shape — which is what a page builder is for. A new company page
 * (Careers, Sustainability, …) costs a document, not a schema change.
 *
 * The four launch pages are pinned by semantic ID (`aboutPage`, `contactPage`,
 * `searchPage`, `notFoundPage`); new pages use `slug`.
 *
 * 🔴 Contact stores NO address, email or phone — they live in Global Settings and
 * render from there. The page is a headline, some copy and a form section.
 * No catalogue sections available here — the section picker is scoped per page
 * family. `sections` lands with the inventory (PROD-2292 pt 2).
 */
export const contentPage = defineType({
  name: 'contentPage',
  title: 'Content Page',
  type: 'document',
  icon: DocumentTextIcon,
  groups: groupsFor(['content', 'sections', 'seo', 'social']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Internal Studio label.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description:
        'Required for new pages. The four launch pages (about, contact, search, 404) are pinned by semantic ID instead, so their slug may be empty.',
      options: { source: 'title' },
    }),
    // Content + proof + conversion sections — no catalogue (scoped per §2.4).
    pageSectionsField(SECTION_ALLOW.content),
    ...seoFields({ group: GROUPS.seo, canonical: true, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current' },
    prepare({ title, slug }) {
      return { title: title || 'Content page', subtitle: slug ? `/${slug}` : 'pinned by ID' }
    },
  },
})
