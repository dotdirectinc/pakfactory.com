import { defineArrayMember, defineField, defineType } from 'sanity'
import { checkScopedTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugWithinParent } from '../lib/slug-rules'
import {
  NUMBER_FACT_LABELS,
  TEXT_FACT_LABELS,
  factLabelOptions,
  formatFactValue,
} from '@pakfactory/sanity/fact-labels'

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
      // Unique within the PARENT PROPERTY, not across every Property Value
      // (Eric + Richard, 2026-08-21). A value cannot exist outside a Property,
      // so its identity is (Property, title) — Board Colour's "Gold" and Foil
      // Colour's "Gold" are two terms in two lists, the same scoping `kindOf`
      // already uses. A cross-Property match is a warning, not a block: usually
      // legitimate, occasionally one idea filed twice, never grounds to refuse
      // the save. Two rules because Sanity cannot mix an error and a warning in
      // one `custom`.
      // `Rule.required()` is its OWN entry, not chained onto the first custom rule.
      // Verified against the deployed manifest 2026-08-31: this field serialised as
      // `custom` with no `presence` flag, while `slug` two fields below — chained
      // `Rule.required().custom(...)` — serialised both. The array form was swallowing
      // it, so the Studio showed no required marker. (Eric's review #9, D48.)
      validation: (Rule) => [
        Rule.required(),
        Rule.custom(async (value, context) => {
          const r = await checkScopedTaxonomyTitle(value, context, 'property', 'property')
          return 'ok' in r || r.level !== 'error' ? true : r.message
        }),
        Rule.custom(async (value, context) => {
          const r = await checkScopedTaxonomyTitle(value, context, 'property', 'property')
          return 'ok' in r || r.level !== 'warning' ? true : r.message
        }).warning(),
      ],
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description:
        'URL-safe identifier, generated from the title. A stable key — rename the title freely, but change the slug deliberately (a slug in a URL needs a redirect).',
      options: { source: 'title' },
      // Scoped to the Property for the same reason as the title: the filter URL
      // is ?<property>=<slug>, so the property is the namespace and two Golds
      // never meet. Checked before shipping — no front-end query looks a value
      // up by slug alone.
      validation: (Rule) =>
        Rule.required().custom(uniqueSlugWithinParent('propertyValue', 'property', 'property')),
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
        'Optional. The broader value this is a kind of — "Champagne is a kind of Gold". Same Property only, one hop: the target cannot itself be a kind of something, and this cannot be a kind of anything while other values are a kind of it. Leave empty for a plain value.',
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

          // Both halves of the one-hop rule in one round trip.
          //
          // `target` guards the side the picker also filters: you may not point at
          // a value that is itself a kind of something.
          //
          // `dependents` guards the side nothing guarded before. The picker can
          // only see the value being edited, so it cannot know that OTHER documents
          // already point here — and that edit happens on a different document, so
          // the reference stays valid and silently wrong. Without this, setting
          // `Champagne -> Gold` and later `Gold -> Metallics` builds the two-level
          // chain D40 exists to prevent, and the configurator has to decide which
          // level becomes the heading.
          //
          // Both filters are index-backed (`_id == $literal`, `kindOf._ref ==
          // $literal`), so this stays a lookup rather than a scan as the vocabulary
          // grows.
          const { target, dependents } = await client.fetch<{
            target: { prop?: string; hasKindOf?: boolean } | null
            dependents: string[]
          }>(
            `{
              "target": *[_id == $id][0]{ "prop": property._ref, "hasKindOf": defined(kindOf) },
              "dependents": *[
                _type == "propertyValue" &&
                kindOf._ref == $self &&
                !(_id in [$self, $draftSelf])
              ].title
            }`,
            { id: ref, self: selfId ?? '', draftSelf: `drafts.${selfId ?? ''}` },
          )

          if (dependents?.length) {
            const named = dependents.slice(0, 3).join(', ')
            const more = dependents.length > 3 ? ` and ${dependents.length - 3} more` : ''
            return `One hop only. ${named}${more} ${
              dependents.length === 1 ? 'is' : 'are'
            } a kind of this value, so this one cannot itself be a kind of something — that would make it both a heading and a shade. Clear "Kind of" on ${
              dependents.length === 1 ? 'that value' : 'those values'
            } first, or leave this empty.`
          }

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
      validation: (Rule) =>
        Rule.custom((facts, context) => {
          const list = Array.isArray(facts) ? (facts as { label?: string; value?: number }[]) : []

          // One row per label — Caliper cannot appear twice on one value.
          const labels = list.map((f) => f?.label).filter(Boolean) as string[]
          const dup = labels.find((l, i) => labels.indexOf(l) !== i)
          if (dup) return `Each label may appear once — "${dup}" is repeated.`

          // Caliper guard (PROD-2287 · per-Option thickness decision): a point IS
          // 1/1000", so `caliper` is definitional and gets retyped once per
          // (board × thickness) document — the one number free to drift. Where the
          // title starts with a point size (`12pt - SBS`), a caliper fact must
          // equal size ÷ 1000. Fires only on such titles; silent with no caliper
          // row. ⚠️ Order is load-bearing: `SBS 12pt` skips this (fail-open).
          const title = ((context.document as { title?: string } | undefined)?.title ?? '').trim()
          const m = title.match(/^(\d+(?:\.\d+)?)\s*pt\b/i)
          if (m) {
            const caliper = list.find((f) => f?.label === 'caliper')
            if (caliper && typeof caliper.value === 'number') {
              const expected = parseFloat(m[1]) / 1000
              if (Math.abs(caliper.value - expected) > 1e-9) {
                return `Caliper for ${m[1]}pt must be ${expected}" (point size ÷ 1000). A measured — rather than nominal — caliper is a different label, not a different number.`
              }
            }
          }
          return true
        }),
    }),
    // ─── Retiring ────────────────────────────────────────────────────────────
    // `value` and `description` were removed in PROD-2287 (Decisions D40): both
    // were empty on all 32 documents. A value's machine-readable rendering is now
    // `image` (a hex can't represent a metallic); its meaning lives in Glossary
    // Term, the single source of every definition.
    // `order` was REMOVED here on 2026-09-01. ⚠️ Unlike Property's, this one has NO
    // successor and never will under the current design: `listingPage.filters` states
    // that "the VALUES inside each filter are always derived from the content — never
    // listed here". So value order was designed away rather than relocated, and the 32
    // curated sequences (Matte → Gloss → Soft Touch; Opaque → Translucent →
    // Transparent) had nowhere to go. They are recorded in ADR-017. 🔴 If a filter's
    // values must render in a meaningful order rather than alphabetically, that is an
    // open question for Eric, not a field to restore here.
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
