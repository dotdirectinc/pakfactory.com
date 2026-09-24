import { defineArrayMember, defineField, defineType } from 'sanity'
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
 * page (plus `points`, PROD-2577); `intro`/`body`/`faqs`/SEO apply only once
 * `hasPage` is on.
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
      description: 'The service’s name, as it appears on its stage page.',
      validation: (Rule) => Rule.required(),
    }),
    // No H1 or Short name here: this type has no page at launch. Its empty
    // `displayTitle` was removed with the rest of them; add the pair when the
    // service pages are actually built.
    defineField({
      name: 'stage',
      title: 'Stage',
      type: 'reference',
      group: GROUPS.content,
      description: 'The Expertise Stage this service belongs to — exactly one, and not meant to change.',
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
      description: 'The sentence or two that renders on the stage page.',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      group: GROUPS.content,
      description:
        'Optional — shown beside the service when its stage lists services without a named method (e.g. Design).',
      options: { hotspot: true },
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
      name: 'points',
      title: 'Points',
      type: 'array',
      group: GROUPS.content,
      description:
        'What this service covers, as short points (e.g. "Packaging audit"). Shown under the summary where the stage lists its services (the Signature system section). Add a gloss to explain a term in plain language on first use.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'servicePoint',
          title: 'Point',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'gloss',
              title: 'Gloss',
              type: 'string',
              description:
                'Optional plain-language explanation (e.g. for LCA, EPR, TCO).',
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'gloss' } },
        }),
      ],
      validation: (Rule) => Rule.max(6),
    }),
    defineField({
      name: 'hasPage',
      title: 'Has a page',
      type: 'boolean',
      group: GROUPS.content,
      description: 'An editorial judgement — turn it on only when this service earns its own page.',
      initialValue: false,
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'Only meaningful once "Has a page" is on. Must be unique across services.',
      options: { source: 'title' },
      validation: (Rule) => Rule.custom(uniqueSlugAcross(['expertiseService'])),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: GROUPS.content,
      description: 'Lifecycle — Active, Coming soon or Discontinued.',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Coming soon', value: 'coming-soon' },
          { title: 'Discontinued', value: 'discontinued' },
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
      description: 'Opening copy — only written once the service has a page.',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: GROUPS.content,
      description: 'The main copy — only written once the service has a page. Optional.',
      of: [{ type: 'block' }],
    }),

    // ─── CATEGORIZATION ───────────────────────────────────────────────────────
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SEO / SOCIAL (apply only when hasPage is on) ─────────────────────────
    ...seoFields({ group: GROUPS.seo, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'title', stage: 'stage.title', hasPage: 'hasPage' },
    prepare({ title, stage, hasPage }) {
      return {
        title: title || 'Untitled service',
        subtitle: [stage, hasPage ? 'Has page' : 'Term only'].filter(Boolean).join(' · '),
      }
    },
  },
})
