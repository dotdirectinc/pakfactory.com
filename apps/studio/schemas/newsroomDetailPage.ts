import {defineField, defineType} from 'sanity'
import {BellIcon} from '@sanity/icons'
import {
  NEWSROOM_ABOUT_TEXT,
  NEWSROOM_MEDIA_CONTACT_EMAIL,
  NEWSROOM_MEDIA_CONTACT_TEXT,
} from '@pakfactory/sanity/newsroom-press-copy'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Newsroom Detail Page — listable layout version for `/newsroom/[slug]`
 * (PROD-2909).
 *
 * Owns section **order + default chrome** for every `pressRelease` that points
 * at this doc via `pressRelease.template`. The release itself — headline,
 * dateline, body — stays on the release; sections here are the shared bands
 * below it. An empty `template` falls back to the Default id, exactly as
 * products do.
 *
 * No public URL / SEO — it is a layout template, not a routable page.
 * Optional `previewImage` is Studio chrome only (list + Template picker).
 */
export const newsroomDetailPage = defineType({
  name: 'newsroomDetailPage',
  title: 'Newsroom Detail Page',
  type: 'document',
  icon: BellIcon,
  groups: groupsFor(['content', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'Internal Studio label for this layout (e.g. "Default"). Shown when a release picks ' +
        'this template.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this layout, shown in the Newsroom Detail Pages list and when a ' +
        'release picks this template. Leave empty to use the default icon. Not shown on the site.',
    }),
    // ── Press boilerplate (PROD-2918 review) ──────────────────────────────
    // The `###` end mark, the two cards and their headings are code; the copy
    // lives here so editors change it once for every release on this layout.
    // Empty fields fall back to the same standard copy in code, so a template
    // created before these fields existed still renders both cards.
    defineField({
      name: 'aboutText',
      title: 'About PakFactory',
      type: 'array',
      group: GROUPS.content,
      of: [
        {
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          lists: [],
        },
      ],
      initialValue: NEWSROOM_ABOUT_TEXT,
      description:
        'Shown at the end of every release that uses this layout, under "About PakFactory". ' +
        'Leave empty to use the standard copy.',
    }),
    defineField({
      name: 'mediaContactText',
      title: 'Media contact line',
      type: 'string',
      group: GROUPS.content,
      initialValue: NEWSROOM_MEDIA_CONTACT_TEXT,
      description:
        'Text before the email address in the "Media contact" card. ' +
        `Leave empty to use "${NEWSROOM_MEDIA_CONTACT_TEXT}".`,
    }),
    defineField({
      name: 'mediaContactEmail',
      title: 'Media contact email',
      type: 'string',
      group: GROUPS.content,
      initialValue: NEWSROOM_MEDIA_CONTACT_EMAIL,
      validation: (Rule) => Rule.email(),
      description: `Linked as a mailto. Leave empty to use ${NEWSROOM_MEDIA_CONTACT_EMAIL}.`,
    }),
    pageSectionsField(
      SECTION_ALLOW.newsroomDetail,
      'sections',
      'Sections that render below the article and the About PakFactory / media contact cards. ' +
        'The release itself is not editable here.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections', media: 'previewImage'},
    prepare({title, sections, media}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled newsroom detail page',
        subtitle: `Release layout · ${count} section(s)`,
        media: media || BellIcon,
      }
    },
  },
})
