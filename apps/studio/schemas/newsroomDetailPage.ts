import {defineField, defineType} from 'sanity'
import {BellIcon} from '@sanity/icons'
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
    pageSectionsField(
      SECTION_ALLOW.newsroomDetail,
      'sections',
      'Sections that render below the article and the About PakFactory / media contact block. ' +
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
