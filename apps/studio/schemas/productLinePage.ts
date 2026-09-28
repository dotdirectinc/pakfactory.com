import {defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Product Line Page — listable layout version for Product Line LPs.
 *
 * Owns **hero shell** (`heroLayout`) plus section **order + default chrome** for
 * every `productLine` that points at this doc via `productLine.template`.
 * Per-page band content (FAQs, case studies, related lines, …) stays on the
 * product line. Editors can create multiple versions (e.g. Stack vs Bottom bar);
 * lines pick one on the Template tab. Optional `previewImage` is Studio chrome
 * only (list + Template picker) — not shown on the site.
 *
 * No public URL / SEO — it is a layout template, not a routable page.
 */
export const productLinePage = defineType({
  name: 'productLinePage',
  title: 'Product Line Page',
  type: 'document',
  icon: PackageIcon,
  groups: groupsFor(['content', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'Internal Studio label shown when a product line picks this layout (e.g. "Default", "Bottom bar").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroLayout',
      title: 'Hero layout',
      type: 'string',
      group: GROUPS.content,
      description:
        'Landing hero chrome for every product line that selects this layout. ' +
        'Stack = featured icon and copy above the media; Bottom bar = media-first with ' +
        'heading and CTAs along the bottom. Does not change which bands appear — that is ' +
        'section order below. Band content stays on each product line.',
      options: {
        list: [
          {title: 'Stack (default)', value: 'stack'},
          {title: 'Bottom bar', value: 'bottomBar'},
        ],
        layout: 'radio',
      },
      initialValue: 'stack',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description:
        'Screenshot of this layout’s hero (stack or bottom bar). Shown in the Product Line Pages ' +
        'list and when a product line picks this template. Leave empty to use the default icon. ' +
        'Not shown on the site — Studio chrome only. Prefer ~640×360 crops from staging.',
    }),
    pageSectionsField(
      SECTION_ALLOW.productPage,
      'sections',
      'Section order and default headings for product lines that select this layout. ' +
        'Rearrange here — every line pointed at this document reflects the new order. ' +
        'Band content (FAQs, cards, related lines) is authored on each product line, ' +
        'matched by section key. Need a different arrangement for one line? Create ' +
        'another Product Line Page layout and point that line at it.',
    ),
  ],
  preview: {
    select: {
      title: 'title',
      heroLayout: 'heroLayout',
      sections: 'sections',
      media: 'previewImage',
    },
    prepare({title, heroLayout, sections, media}) {
      const shell =
        heroLayout === 'bottomBar'
          ? 'Bottom bar'
          : heroLayout === 'stack'
            ? 'Stack'
            : 'Hero unset'
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled product line page',
        subtitle: `${shell} · ${count} section(s)`,
        media: media || PackageIcon,
      }
    },
  },
})
