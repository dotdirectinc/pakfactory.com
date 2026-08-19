import { defineField, defineType } from 'sanity'
import { ComponentIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { faqsField } from '../lib/faq-field'
import { uniqueSlugAcross } from '../lib/slug-rules'

/**
 * Expertise Service — one named service inside an Expertise Stage; the third
 * level of the Expertise section (Entities/Expertise Service.md). A document from
 * day one, a page only when it earns one (`hasPage`, same rule as Solution).
 *
 * ⚠️ It's a document, not an embedded object, on purpose: some services will get
 * child pages in a later phase, and embedded content can't become a page without
 * being deleted and re-created (breaking every link). A document with `hasPage`
 * off costs nothing. At launch it renders as `title` + `summary` on its stage's
 * page; `intro`/`body`/`faqs`/SEO apply only once `hasPage` is on.
 *
 * Expect ZERO documents when this ships — that is the intended end state, not an
 * unfinished one. Nothing else in the model depends on it, and the service list
 * is a content job with no current source (the company knowledge base is stale).
 */
export const expertiseService = defineType({
  name: 'expertiseService',
  title: 'Expertise Service',
  type: 'document',
  icon: ComponentIcon,
  groups: groupsFor(['content', 'categorization', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: "The service's name.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'displayTitle',
      title: 'Display title',
      type: 'string',
      group: GROUPS.content,
      description: 'Optional front-end override.',
    }),
    defineField({
      name: 'stage',
      title: 'Stage',
      type: 'reference',
      group: GROUPS.content,
      description: 'The Expertise Stage this service belongs to — required, and permanent (a service belongs to exactly one stage).',
      to: [{ type: 'expertiseStage' }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: 'The sentence or two that renders on the stage page. This is all phase one needs.',
    }),
    defineField({
      name: 'hasPage',
      title: 'Has a page',
      type: 'boolean',
      group: GROUPS.content,
      description: 'Terms are free, pages are earned. Off at launch — turn on only when this service earns its own page.',
      initialValue: false,
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'Only meaningful once "Has a page" is on.',
      options: { source: 'title' },
      validation: (Rule) => Rule.custom(uniqueSlugAcross(['expertiseService'])),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: GROUPS.content,
      description: 'Lifecycle of the service.',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Future', value: 'future' },
          { title: 'Deprecated', value: 'deprecated' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'array',
      group: GROUPS.content,
      description: 'Only written when the service gets a page.',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: GROUPS.content,
      description: 'Only written when the service gets a page. Optional and mostly unwritten.',
      of: [{ type: 'block' }],
    }),

    // ─── CATEGORIZATION ───────────────────────────────────────────────────────
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SEO / SOCIAL (apply only when hasPage is on) ─────────────────────────
    ...seoFields({ group: GROUPS.seo, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'title', display: 'displayTitle', stage: 'stage.title', hasPage: 'hasPage' },
    prepare({ title, display, stage, hasPage }) {
      return {
        title: display || title || 'Untitled service',
        subtitle: [stage, hasPage ? 'Has page' : 'Term only'].filter(Boolean).join(' · '),
      }
    },
  },
})
