import { defineArrayMember, defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'
import {
  NUMBER_FACT_LABELS,
  TEXT_FACT_LABELS,
  factLabelOptions,
  formatFactValue,
} from '../lib/fact-labels'

export const propertyValue = defineType({
  name: 'propertyValue',
  title: 'Property Value',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    // Specs (§2.4): the manufacturing facts that show beside this value.
    { name: 'specs', title: 'Specs' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The value an editor picks — e.g. "Matte", "300 GSM", "Kraft".',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description:
        'URL-safe identifier, generated from the title. A stable key — rename the title freely, but change the slug deliberately (a slug in a URL needs a redirect).',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['propertyValue'])),
    }),
    defineField({
      name: 'property',
      title: 'Property',
      type: 'reference',
      group: 'content',
      description: 'The Property this is a value of (its parent) — required.',
      to: [{ type: 'property' }],
      // §4.2 governance: pick an existing Property, never mint one inline from
      // this picker — that is how a taxonomy drifts into two spellings.
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    // ─── D40: image + kindOf ────────────────────────────────────────────────
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      description:
        'Optional. What lets someone recognise this value at a glance — a metallic sheen, a kraft texture, a flute profile. No alt field by design (D40): where a label sits beside it the front end uses empty alt, and where it stands alone it derives alt from the title.',
    }),
    defineField({
      name: 'kindOf',
      title: 'Kind of',
      type: 'reference',
      group: 'content',
      to: [{ type: 'propertyValue' }],
      description:
        'Optional. The broader value this is a kind of — "Champagne is a kind of Gold". Same Property only, one hop (the target cannot itself be a kind of something). Leave empty for a plain value.',
      options: {
        disableNew: true,
        // Only same-Property base values (no kindOf of their own), never self.
        filter: ({ document }: { document?: { _id?: string; property?: { _ref?: string } } }) => {
          const prop = document?.property?._ref
          const self = document?._id?.replace(/^drafts\./, '') ?? ''
          if (!prop) return { filter: 'false' }
          return {
            filter: 'property._ref == $prop && !defined(kindOf) && !(_id in [$self, $draftSelf])',
            params: { prop, self, draftSelf: `drafts.${self}` },
          }
        },
      } as never,
      validation: (Rule) =>
        Rule.custom(async (kindOf, context) => {
          const ref = (kindOf as { _ref?: string } | undefined)?._ref
          if (!ref) return true
          const doc = context.document as
            | { _id?: string; property?: { _ref?: string } }
            | undefined
          const selfId = doc?._id?.replace(/^drafts\./, '')
          if (ref === selfId) return 'A value cannot be a kind of itself.'
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const target = await client.fetch<{ prop?: string; hasKindOf?: boolean } | null>(
            `*[_id == $id][0]{ "prop": property._ref, "hasKindOf": defined(kindOf) }`,
            { id: ref },
          )
          if (!target) return true
          if (target.prop !== doc?.property?._ref) return 'Must be a value of the same Property.'
          if (target.hasKindOf) return 'One hop only — the target cannot itself have a "kind of".'
          return true
        }),
    }),
    // ─── D41: facts (replaces the deleted Option Group) ──────────────────────
    defineField({
      name: 'facts',
      title: 'Facts',
      type: 'array',
      group: 'specs',
      description:
        'What shows beside this value in the configurator — Caliper, Flute height, "Commonly used for". Only facts that are the SAME for every option belong here; a number that differs per option lives on the Option. Labels come from a fixed list. ⚠️ Column order on the page comes from that list, not this array — reordering rows here changes nothing on the page.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'factNumber',
          title: 'Number fact',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              options: { list: factLabelOptions(NUMBER_FACT_LABELS) },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: 'Value',
              type: 'number',
              description: 'The bare number — the unit comes from the label, never typed here.',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { label: 'label', value: 'value' },
            prepare({ label, value }) {
              const l = NUMBER_FACT_LABELS.find((x) => x.value === label)
              return {
                title: l?.title ?? label ?? 'Number fact',
                subtitle: value == null ? '—' : formatFactValue(value, l),
              }
            },
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'factText',
          title: 'Text fact',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              options: { list: factLabelOptions(TEXT_FACT_LABELS) },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'text',
              title: 'Text',
              type: 'string',
              validation: (Rule) => Rule.required().max(80),
            }),
          ],
          preview: {
            select: { label: 'label', text: 'text' },
            prepare({ label, text }) {
              const l = TEXT_FACT_LABELS.find((x) => x.value === label)
              return { title: l?.title ?? label ?? 'Text fact', subtitle: text }
            },
          },
        }),
      ],
      // One row per label — Caliper cannot appear twice on one value.
      validation: (Rule) =>
        Rule.custom((facts) => {
          const list = Array.isArray(facts) ? (facts as { label?: string }[]) : []
          const labels = list.map((f) => f?.label).filter(Boolean) as string[]
          const dup = labels.find((l, i) => labels.indexOf(l) !== i)
          return dup ? `Each label may appear once — "${dup}" is repeated.` : true
        }),
    }),
    // ─── Retiring ────────────────────────────────────────────────────────────
    // `value` and `description` were removed in PROD-2287 (Decisions D40): both
    // were empty on all 32 documents. A value's machine-readable rendering is now
    // `image` (a hex can't represent a metallic); its meaning lives in Glossary
    // Term, the single source of every definition.
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'content',
      readOnly: true,
      description: 'Lower numbers sort first within the parent property.',
      // Retiring (§4.3), same as on Property: ordering moves to an ordered array
      // on the listing/nav singleton (PROD-2292). Read-only until then — still
      // set on all 32 values, so kept rather than dropped.
      deprecated: {
        reason: 'Ordering moves to an ordered array on the listing/nav singleton (PROD-2292).',
      },
    }),
  ],
  preview: {
    select: { title: 'title', group: 'property.title', media: 'image', kindOf: 'kindOf.title' },
    prepare({ title, group, media, kindOf }) {
      const subtitle = kindOf ? `${group} — kind of ${kindOf}` : group
      return { title, subtitle, media }
    },
  },
  orderings: [
    {
      title: 'Property → title',
      name: 'groupTitle',
      by: [
        { field: 'property.title', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
})
