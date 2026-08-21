import { defineArrayMember, defineField } from 'sanity'
import type { Rule } from 'sanity'
import { maxCurated } from './schema-guards'

/**
 * The one `faqs` field every FAQ-carrying type shares — Conventions §2.4 / the
 * FAQ entity spec. Ten types carry FAQs and an editor should learn the field
 * once; the only thing that varies is whether typing a question in place is
 * allowed, and that is true exactly where the page is an article.
 *
 * | Mode        | Members                              | Who uses it |
 * | ----------- | ------------------------------------ | ----------- |
 * | `reference` | reference to a shared FAQ document   | Product · Product Line · Product Style · Bundle · Solution · Expertise Stage · Expertise Service |
 * | `mixed`     | reference **or** typed question+answer | Post · Guide — an article owns its questions, and references a shared answer when one exists |
 *
 * The reference member is the load-bearing half: without it a page retypes an
 * answer that already exists as an FAQ document, the two drift, and nothing keeps
 * them in step (P3 — never store a fact twice). The editor's rule for the mixed
 * mode is one question: *would this answer be useful on a page other than this
 * one?* Yes → write it as an FAQ document and reference it. No → type it here.
 */

/** The typed question+answer member (mixed mode only) — mirrors the blog's `faqItem`. */
const typedFaqMember = defineArrayMember({
  type: 'object',
  name: 'faqItem',
  title: 'Typed Q&A',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      description: 'As a reader would ask it, not an internal label.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'array',
      description:
        'Self-contained — 2–4 sentences. Supports bold, italic and links. Type this only when the answer makes sense on no other page; otherwise reference an FAQ document above.',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (rule: Rule) =>
                      rule.uri({ allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel'] }),
                  },
                ],
              },
            ],
          },
        },
      ],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'question' },
    prepare: ({ title }) => ({ title: title || 'Typed Q&A' }),
  },
})

/** Reference member — points at a shared FAQ document. */
const faqReferenceMember = defineArrayMember({
  type: 'reference',
  name: 'faqRef',
  title: 'Shared FAQ',
  to: [{ type: 'faq' }],
})

type FaqsFieldOptions = {
  /** Field group/tab id — FAQs live under Categorization everywhere (§2.4). */
  group?: string
  /** `reference` (curated refs only) or `mixed` (refs or typed). Default `reference`. */
  mode?: 'reference' | 'mixed'
  /** Max curated entries. Default 6 (the "3–6 FAQs" rule). */
  max?: number
  /** Min curated entries. Omit for "up to N". */
  min?: number
  /** Override the field description. */
  description?: string
}

/**
 * The shared `faqs` array field. Import it, choose the mode, drop it under
 * Categorization.
 *
 * @example  faqsField({ group: GROUPS.categorization })                  // commercial: refs only, 3–6
 * @example  faqsField({ group: GROUPS.categorization, mode: 'mixed' })   // Guide/Post: refs or typed
 */
export function faqsField({
  group,
  mode = 'reference',
  max = 6,
  min,
  description,
}: FaqsFieldOptions = {}) {
  const of =
    mode === 'mixed' ? [faqReferenceMember, typedFaqMember] : [faqReferenceMember]
  const defaultDescription =
    mode === 'mixed'
      ? 'This page’s questions. Reference a shared FAQ document when the answer exists elsewhere, or type one in place when it only makes sense here.'
      : 'Curated FAQs for this page — reference shared FAQ documents. Keep it to the few that convert; never link out to the Help Center.'
  return defineField({
    name: 'faqs',
    title: 'FAQs',
    type: 'array',
    ...(group ? { group } : {}),
    description: description ?? defaultDescription,
    of,
    validation: maxCurated(max, min),
  })
}
