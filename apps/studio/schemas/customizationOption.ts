import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'
import { seoFields } from '../lib/seo-fields'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { CompatibleCustomizationsInput } from '../components/CompatibleCustomizationsInput'

export const customizationOption = defineType({
  name: 'customizationOption',
  title: 'Customization Option',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'categorization', title: 'Categorization' },
    { name: 'specs', title: 'Specs' },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social' },
  ],
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The customization option name shown to customers (e.g. "Matte Lamination").',
      // `uniqueTaxonomyTitle` was missing here while Category and Type both had it
      // (PROD-2462). Same type only, case- and punctuation-insensitive.
      //
      // Verified safe before adding, not assumed: all 126 titles reduce to 126
      // DISTINCT comparison keys, so no existing document becomes unsaveable. The
      // near-misses are legitimately different things and normalise apart — "Gloss"
      // the customer-facing finish vs "Gloss Lamination" the process that achieves
      // it, "Blind Embossing" vs "Blind Embossing & Debossing", "Spot UV" vs
      // "Spot UV / Spot Gloss".
      //
      // The four titles that DO collide across types — Digital Printing, Gloss,
      // Matte, Soft Touch, each shared with a customizationType or propertyValue —
      // are untouched by this, because the rule scopes to `_type == $type`. That is
      // deliberate: a Property Value named Gloss and an Option named Gloss are two
      // terms in two lists, the same reasoning that scopes `propertyValue` titles to
      // their parent Property.
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    // A configurator swatch cannot carry "High-Impact Polystyrene (HIPS) Blister
    // Plastic", but Title has to stay unambiguous — the content team uses it to
    // tell Matte Lamination from Leather Lamination. Short name is the
    // customer-facing label; empty falls back to Title, so leaving it alone is
    // always correct.
    //
    // NO `h1` here, unlike Line / Style / Solution / Product. The six options
    // that earn a page (`role: reference`) are the six with the SHORTEST titles
    // in the set — UV Coating, Matte Lamination — so there is no heading to
    // override; the long names are all `configurable`, which by the rule below
    // have no URL at all. Revisit when the capability routing model is settled.
    //
    // Not surfaced in `preview` yet — that block reads three deleted fields and
    // is wrong on all 33 documents (PROD-2462), so it gets fixed as a whole
    // rather than half-patched here.
    defineField({
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      group: 'content',
      description:
        'A shorter, customer-facing version of the Title — for the configurator swatch, chips and listings, where the full technical name will not fit. Leave empty to use the Title.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description: 'URL-safe identifier, generated from the title. Unique across all customizations.',
      options: { source: 'title' },
      validation: (Rule) =>
        Rule.required().custom(async (slug, context) => {
          if (!slug?.current) return 'Slug is required'
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const doc = context.document as { _id?: string }
          const id = doc?._id?.replace('drafts.', '')
          const draftId = `drafts.${id}`
          const existing = await client.fetch(
            `*[_type == "customizationOption" && slug.current == $slug && !(_id in [$id, $draftId])][0]._id`,
            { slug: slug.current, id, draftId }
          )
          return existing ? 'Slug must be unique across all customizations' : true
        }),
    }),
    // `category` was retired here (PROD-2250, Rename Map). The Category is reachable as
    // `type->category`, and a second stored path to the same fact is how the two drift
    // apart. Verified on production before removal: all 33 Options agreed with
    // `type->category`, and no Option's Type lacked a category — so the value is
    // reconstructible everywhere and nothing is lost.
    //
    // It also carried the Type picker's filter, which is why that goes with it: the
    // filter needed a category stored on THIS document to narrow by. The Type picker is
    // now unfiltered and always visible. That is a real trade — 23 Types instead of a
    // narrowed handful — taken because the alternative is storing a fact twice to make
    // a picker shorter. Search in the picker covers it.
    defineField({
      name: 'type',
      title: 'Type',
      type: 'reference',
      group: 'content',
      to: [{ type: 'customizationType' }],
      description:
        'Which Customization Type this option belongs to. The Category follows from the Type — it is not stored here.',
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    // Designed in `Entities/Customization Option.md` and never built until now:
    // "The definition lives there ONLY; the Option page pulls it, never retypes it."
    //
    // This is the field `whatIsBlock` retires INTO. Until it existed, deprecating
    // `whatIsBlock` left its 8 documents of definition copy with nowhere to go — the
    // consequence ADR-017 recorded and this closes.
    //
    // ⚠️ There are 0 Glossary Term documents today, so the picker starts empty. That is
    // the authoring backlog, not a schema problem: `disableNew` is deliberately NOT set
    // here, because the terms have to be created before anything can point at them.
    defineField({
      name: 'glossaryTerm',
      title: 'Glossary term',
      type: 'reference',
      group: 'content',
      to: [{ type: 'glossaryTerm' }],
      description:
        'The industry term this option is an instance of. The definition lives on the Glossary Term only — the option page pulls it and never restates it.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'content',
      description: 'Lifecycle: Active (offered now), Coming soon, or Discontinued (retired).',
      options: {
        layout: 'radio',
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Coming soon', value: 'coming-soon' },
          { title: 'Discontinued', value: 'discontinued' },
        ],
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    // ─── D55 (PROD-2482): `role` SPLIT INTO TWO FIELDS ────────────────────────
    // `role` answered two independent questions with one value: `configurable`
    // meant "a customer picks this" AND "this has no URL"; `reference` meant the
    // inverse of both. Across the 33 mock Options that held, so the assumption
    // went unexamined. The Notion Demo import falsified it — `Detail Page` is
    // checked on 102 of 113 rows, because the content team gives detail pages to
    // things customers also pick (Magnetic Closure, Hot Foil Stamping, Spot UV,
    // SBS). "Pickable AND has a page" is the MAJORITY of the catalogue and had no
    // way to be recorded at all. D54 flagged that and left it open; D55 closes it.
    //
    // This is the same defect D47 fixed on `appliesTo`, which held two grids in
    // one array: one field cannot carry two questions when their answers vary
    // independently. Same shape, same fix.

    defineField({
      name: 'configuratorRole',
      title: 'Configurator role',
      type: 'string',
      group: 'content',
      description:
        'Does a customer pick this in the configurator? Configurable: Matte, High-Barrier, SBS. ' +
        'Reference: VMPET Film, Matte Lamination — real materials and processes a customer never picks ' +
        'directly, reached through the simplified option they achieve. This no longer decides whether ' +
        'the document has a page; that is "Has a page".',
      options: {
        layout: 'radio',
        list: [
          { title: 'Configurable — a customer picks this in the configurator', value: 'configurable' },
          { title: 'Reference — technical; never reaches the configurator', value: 'reference' },
        ],
      },
      // Named `configuratorRole`, not `role`. There is a PROPERTY DOCUMENT titled
      // "Role" (ag-role-r2304, "Layer role in multi-layer flexible structures":
      // Barrier Layer / Outer Layer / Sealant Layer). Once Pouch Layer is built, a
      // single Option would show a field labelled "Role" = Reference beside a
      // Properties list containing "Barrier Layer" — a value of the Property named
      // Role. Two unrelated meanings on one screen. The original naming note
      // (HANDOFF-D47) checked `kindOf` for a clash but not the Property list.
      // Dormant today: 0 Options use those values, which is why it is cheap now.
      //
      // Fails loud, unchanged from `role`: a forgotten `reference` Option produces a
      // warning nobody needed, which is visible. A forgotten `configurable` Option
      // would go silent and hide a customer-facing choice.
      initialValue: 'configurable',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'hasPage',
      title: 'Has a page',
      type: 'boolean',
      group: 'content',
      description:
        'Does this option have a library page of its own? An editorial judgement — demand, search value, ' +
        'whether there is enough to say. Authored, never derived. An option can be offered in the ' +
        'configurator without earning a page, and can earn a page while also being pickable.',
      // Named `hasPage` to match `solution.hasPage` and `expertiseService.hasPage`,
      // which answer this exact question in the same words. One name per concept —
      // `hasDetailPage` would be a second name for a settled one.
      //
      // Backfilled from the Notion `Detail Page` column for the 113 imported
      // Options (the committed export, 102 true / 11 false), and from
      // `role == 'reference'` for the 13 with no Notion counterpart. So this is
      // authored data recovered, not a value invented at migration time.
      //
      // ⚠️ NOTHING READS THIS YET. Routing for capability pages is still open —
      // see the TODO(capability) in `presentation/locations.ts`. D55 records the
      // fact; wiring it to a URL is a separate piece of work.
      initialValue: false,
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'content',
      description: 'Add images in render order — first image = hero.',
      of: [taggedImageType([MEDIA_TAG.customization], { hotspot: true })],
    }),

    // ─── CATEGORIZATION (applicability + related lists) ───────────────────────

    // ─── AVAILABILITY AND COMPATIBILITY ───────────────────────────────────────
    // Two axes were answered here by four fields. All four are gone as of
    // PROD-2538 — deprecated first, then removed once nothing read them and
    // their successors were verified complete. What follows is a summary of
    // where each answer went, because the next person to want one of those
    // fields back should find the argument before the empty space.
    //
    // THE PRODUCT AXIS MOVED (PROD-2529). A Product states which options it
    // offers, in `product.availableCustomizations`, and that is the only place
    // it is stated — the two directions used to both be writable with nothing
    // deciding which won.
    //
    // ⚠️ `availableOnProducts` held two entries when it was deleted, and they
    // could not be carried over: they named product LINES, and the product side
    // enumerates option by option. The three facts — CCNB on Folding Cartons,
    // SBS on Folding Cartons and Rigid Boxes — are recorded in the decision
    // register, because a coarse claim has nowhere to live in a fine model.
    //
    // THE CUSTOMIZATION AXIS COLLAPSED TO ONE FIELD (PROD-2534).
    // `worksOnCustomizations` and `incompatibleWithCustomizations` became
    // `compatibleCustomizations` below: one atomic list, read both ways.
    //
    // ⚠️ The deleted pair existed because ONE ARRAY CAN CARRY ONLY ONE MEANING
    // FOR "EMPTY", and an allow-list and a deny-list want opposite ones. That
    // argument was sound and it is not what changed — what changed is who
    // authors the list. The spec system will own compatibility and push it
    // whole, and a machine does not care that one polarity is dense: a flat
    // list of option-to-option pairs is idempotent and diffable, where a Type
    // reference forces the sync to decide when to collapse N options into one,
    // and that decision is unstable across runs.
    //
    // 🔴 So the cost is real and is accepted rather than avoided: EMPTY NOW
    // FAILS CLOSED. An option with nothing recorded combines with nothing.
    // Every one of them is empty today, which is survivable only because
    // nothing outside the Studio reads this — and which makes populating it a
    // precondition of the configurator, not a follow-up.

    // The one live field on this axis. PROD-2534.
    //
    // ❌ Do not re-add a Customization Type target here, and do not bring back a
    // separate deny-list. Both are the obvious simplifications and both were
    // weighed: a Type reference is cheaper to author by hand but a sync that
    // replaces this list wipes it on its first run, so the saving expires while
    // the read cost — expand "or this option's Type", on BOTH sides of a
    // symmetric read — does not. A second field re-creates the boundary rule
    // that had to be repeated in two descriptions to survive.
    defineField({
      name: 'compatibleCustomizations',
      title: 'Compatible customizations',
      type: 'array',
      group: 'categorization',
      components: { input: CompatibleCustomizationsInput },
      description:
        'Which other customizations can be ordered together with this one. Compatibility reads both ways, so recording it on either of the two options is enough — the other one shows it automatically, muted. Only options a customer can actually pick are offered; an option that just has a library page cannot be combined with anything. EMPTY MEANS NOTHING IS COMPATIBLE: this list is the whole answer rather than a narrowing of some wider default. Source-owned (product data source) once that ships; editable for now.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'customizationOption' }],
          options: { disableNew: true },
        },
      ],
      // Three errors and a warning, and the levels follow D48's test: error
      // where a wrong entry means the RIGHT mechanism never gets used and nobody
      // notices, warning where the entry is merely inert.
      validation: (Rule) => [
        // ── ERROR ──────────────────────────────────────────────────────────
        // Self-reference and repeats. Neither has a legitimate case, so the rule
        // can only ever fire on invalid data — which is what makes an error safe.
        Rule.custom((value, context) => {
          const refs = (value as { _ref?: string }[] | undefined) ?? []
          const selfId = (context.document?._id ?? '').replace(/^drafts\./, '')
          const ids = refs.map((r) => r._ref?.replace(/^drafts\./, '')).filter(Boolean) as string[]

          if (ids.includes(selfId)) return 'An option cannot be compatible with itself.'

          const seen = new Set<string>()
          const repeated = new Set<string>()
          for (const id of ids) {
            if (seen.has(id)) repeated.add(id)
            seen.add(id)
          }
          if (repeated.size > 0) {
            return `${repeated.size} option(s) appear more than once. Each option should be listed at most once.`
          }
          return true
        }),
        // ── ERROR ──────────────────────────────────────────────────────────
        // A sibling in a type a customer takes ONE of. The pair is unreachable,
        // not false — and an editor who ticks it has almost certainly mistaken
        // this field for the one that records exclusivity. A warning would get
        // published through, the data would claim a combination nobody can
        // order, and the real mechanism would stay unset. The message redirects
        // rather than just refusing, because a bare rejection blocks someone
        // without showing them the field they actually wanted.
        Rule.custom(async (value, context) => {
          const doc = context.document as { type?: { _ref?: string } } | undefined
          const ownTypeRef = doc?.type?._ref?.replace(/^drafts\./, '')
          const refs = (value as { _ref?: string }[] | undefined) ?? []
          const ids = refs.map((r) => r._ref?.replace(/^drafts\./, '')).filter(Boolean) as string[]
          if (!ownTypeRef || ids.length === 0) return true
          try {
            const client = context.getClient({ apiVersion: '2024-01-01' })
            const rows = await client.fetch<{ _id: string; title: string | null; typeId: string | null }[]>(
              `*[_id in $ids]{ _id, title, "typeId": type._ref }`,
              { ids },
            )
            const selects = await client.fetch<string | null>(
              `*[_id == $ownTypeRef][0].customerSelects`,
              { ownTypeRef },
            )
            if (selects !== 'one') return true
            const siblings = rows.filter((r) => r.typeId === ownTypeRef)
            if (siblings.length === 0) return true
            return `${siblings.map((s) => s.title || s._id).join(', ')} ${siblings.length === 1 ? 'is' : 'are'} in this option's own type, and a customer chooses only one option from it — so these can never be ordered together. If you meant that a customer may pick several, change "How many can a customer choose?" on the type instead.`
          } catch {
            return true // never block on a lookup failure
          }
        }),
        // ── WARNING ────────────────────────────────────────────────────────
        // A reference-role option is a library page, never something a customer
        // picks, so an entry naming one is inert rather than wrong. It is not
        // reachable through the picker at all — only a script, or flipping an
        // option to `reference` AFTER this was authored. Never auto-cleared: a
        // field switch that silently edits data is worse than one that says
        // something.
        Rule.custom(async (value, context) => {
          const refs = (value as { _ref?: string }[] | undefined) ?? []
          const ids = refs.map((r) => r._ref?.replace(/^drafts\./, '')).filter(Boolean) as string[]
          if (ids.length === 0) return true
          try {
            const client = context.getClient({ apiVersion: '2024-01-01' })
            const rows = await client.fetch<{ _id: string; title: string | null }[]>(
              `*[_id in $ids && configuratorRole != "configurable"]{ _id, title }`,
              { ids },
            )
            if (rows.length === 0) return true
            const names = rows.map((r) => r.title || r._id).join(', ')
            const one = rows.length === 1
            return `${names} ${one ? 'is' : 'are'} not something a customer picks in the configurator — ${one ? 'it has' : 'they have'} a library page instead, so ${one ? 'it' : 'they'} cannot be ordered alongside anything. The ${one ? 'entry has' : 'entries have'} no effect.`
          } catch {
            return true // never block on a lookup failure
          }
        }).warning(),
      ],
    }),
    // D47 §1 — `achieves` names CANDIDATES, not a recipe. It points from a technical
    // option at the simplified, customer-facing option it can deliver: VMPET Film
    // achieves High-Barrier. The reverse list shown on the simplified option is
    // derived from whatever points at it, so nothing is typed there.
    //
    // The non-sufficiency caveat lives in this description because that is the
    // editor-facing surface. The derived reverse list is customer-facing, and
    // "High-Barrier — achievable by: PET, VMPET, LDPE" still reads as "any of these
    // gives you high barrier": whatever renders it needs its own framing copy. That
    // is a rendering concern and no schema change fixes it.
    defineField({
      name: 'achieves',
      title: 'Achieves',
      type: 'array',
      group: 'categorization',
      description:
        'On a technical (Reference) option only: which simplified, customer-facing option this one can deliver — VMPET Film achieves High-Barrier. Listing an option here does NOT claim this one is sufficient on its own; which combination is actually used is decided at quoting.',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const list = Array.isArray(value) ? value : []
          if (list.length === 0) return true
          const role = (context.document as { configuratorRole?: string } | undefined)?.configuratorRole
          if (role === 'configurable') {
            return 'Achieves is for technical options — it names the simplified option this one delivers. A configurable option is already the simplified end of that relationship, so it should be the target, not the source.'
          }
          return true
        }).warning(),
    }),

    // `applicableProductCategories` / `applicableProductStyleCategories` were
    // removed here in PROD-2306 once the backfill into `appliesTo` was verified on
    // production (8/8 options). Run migrate:unset-legacy-applies to drop the now
    // orphaned field data from the dataset.
    // Legacy industry / use-case reference arrays (applicableIndustryCategories,
    // useCases, industries) were removed in PROD-2284 — unpopulated on every
    // option and pointing at the now-retired industry/industryCategory/useCase
    // types. Option applicability is expressed via `properties[]` below.
    // ─── PROPERTIES ───────────────────────────────────────────────────────────
    // One field replacing eight. Each of the eight hardcoded its own property
    // group in a picker filter, so a group with no matching field was
    // unreachable — which is why none of the 33 options can state a Finish Type.
    // Scope now comes from the Type's declaration instead of from the field name.

    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: 'specs',
      description:
        'What this option is, in property values. The choices come from the properties its Customization type declares — if this list is empty, add the property to the type first.',
      of: [{
        type: 'reference',
        to: [{ type: 'propertyValue' }],
        options: {
          disableNew: true,
          filter: ({ document }) => {
            const typeRef = (document as { type?: { _ref?: string } } | undefined)?.type?._ref
            // No type chosen yet, so there is no declaration to scope by.
            if (!typeRef) return { filter: 'false' }
            return {
              filter:
                'property._ref in *[_id == $typeRef][0].properties[].property._ref',
              params: { typeRef },
            }
          },
        },
      }],
      // Two checks the Product side got in PROD-2539, adapted — and the
      // adaptation is the whole point, because the two sides are NOT symmetric.
      //
      // 🔴 `valuesPerItem` applies to STATED properties only. A Type may declare
      // a property SELECTABLE, and then this list is the menu a customer picks
      // from rather than a claim about the option: Corrugated Board declares
      // Color selectable, so White Lined Corrugated Board offering White, Natural
      // Brown and Black is correct, not three colours at once. Measured before
      // this was written — every multi-value property in the dataset is
      // selectable, so a rule without this test would have warned on the only
      // two populated options and been wrong on both.
      //
      // Warning, not error, for the same reason as the Product side: an editor
      // opening an option cannot always fix data that arrived before the picker
      // filter existed, and two options are in exactly that state today.
      validation: (Rule) => [
        Rule.unique(),
        Rule.custom(async (value, context) => {
          const refs = ((Array.isArray(value) ? value : []) as { _ref?: string }[])
            .map((entry) => entry?._ref)
            .filter((ref): ref is string => Boolean(ref))
          const typeRef = (context.document as { type?: { _ref?: string } } | undefined)?.type?._ref
          if (!typeRef || refs.length === 0) return true

          const client = context.getClient({ apiVersion: '2024-01-01' })
          const { declared, values } = await client.fetch<{
            declared: { ref: string | null; usage: string | null }[] | null
            values:
              | {
                  _id: string
                  title: string | null
                  propRef: string | null
                  propTitle: string | null
                  perItem: string | null
                }[]
              | null
          }>(
            `{
              "declared": *[_id == $typeRef][0].properties[]{ "ref": property._ref, usage },
              "values": *[_id in $refs]{
                _id, title,
                "propRef": property._ref,
                "propTitle": property->title,
                "perItem": property->valuesPerItem
              }
            }`,
            { typeRef, refs },
          )

          const declaredList = declared ?? []
          const valueList = values ?? []
          const usageOf = new Map(declaredList.map((d) => [d.ref, d.usage]))
          const problems: string[] = []

          // The flat array carries no grouping, so it is grouped here: the
          // Product side stores one row per property and gets this for free.
          const byProperty = new Map<string, { title: string; perItem: string | null; names: string[] }>()
          for (const v of valueList) {
            if (!v.propRef) continue
            const group = byProperty.get(v.propRef) ?? {
              title: v.propTitle ?? 'This property',
              perItem: v.perItem,
              names: [],
            }
            group.names.push(v.title ?? 'Untitled value')
            byProperty.set(v.propRef, group)
          }

          // 1 — a property the Type never declared. Silent when the Type declares
          // nothing: that is an unfinished Type, not a wrong option.
          if (declaredList.length) {
            for (const [ref, group] of byProperty) {
              if (usageOf.has(ref)) continue
              problems.push(
                `${group.title} is not declared by this customization type — remove ${group.names.join(', ')}, or add the property to the type.`,
              )
            }
          }

          // 2 — more values than the Property allows, stated properties only.
          for (const [ref, group] of byProperty) {
            if (usageOf.get(ref) !== 'stated') continue
            if (group.perItem !== 'one' || group.names.length <= 1) continue
            problems.push(`${group.title} allows one value — ${group.names.join(', ')}.`)
          }

          return problems.length ? problems.join(' ') : true
        }).warning(),
      ],
    }),

    // The five per-topic property fields — `materialSource`, `physicalProperties`,
    // `aesthetic`, `colors`, `sustainability` — were REMOVED here (Rename Map step 5).
    // They were deprecated for months, which the Map warns is not the same as finished.
    //
    // Removal was verified lossless first, not assumed from the deprecation: all
    // 33 references they held across 8 Options were already present in `properties`,
    // with zero gaps. The migration unsets the keys so the dataset does not keep
    // orphaned copies of data `properties` already owns.

    // ─── CONTENT (landing-page prose) ─────────────────────────────────────────

    // `benefits` replaces `whyChooseBlock`, matching what Product and Product Style
    // already ship (D33). "Block" meant rich text and named the mechanism, not the
    // meaning. The old field was deprecated rather than deleted while 8 of 33 Options
    // carried copy; the migration copied it across and a later sweep removed the
    // field and swept the key. The full five steps, finished.
    defineField({
      name: 'benefits',
      title: 'Benefits',
      type: 'object',
      group: 'content',
      description:
        'Why a customer would pick this customization (renamed from whyChooseBlock, D33). Argues the choice; it must not restate the definition — that belongs to the Glossary Term.',
      fields: [
        defineField({ name: 'title', title: 'Title', type: 'string' }),
        defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
      ],
    }),
    // `whatIsBlock` was REMOVED here on 2026-09-01 (Eric's deprecated-fields removal
    // plan). Step 5 had held it back on the grounds that its 8 documents of definition
    // copy — SBS, FBB, CCNB, Kraft and the four laminations — were the only copy, and
    // `glossaryTerm` held 0 documents to move them to. That reasoning was sound and is
    // now MOOT, not solved: Eric read the 8 values and chose to DISCARD them. Glossary
    // content will be written fresh in PakFactory's voice, so carrying eight inherited
    // paragraphs through a migration first buys nothing. The earlier plan in
    // `Rename Map.md:64` / `Entities/Glossary Term.md:47` (migrate into Glossary Terms)
    // is superseded — do not resurrect it from those documents.
    //
    // The `glossaryTerm` reference field above STAYS. It is set on 0 of 33 options and
    // there are 0 glossaryTerm documents, so it resolves to nothing today; that is an
    // unbuilt layer, not a fault.
    //
    // `whyChooseBlock` was REMOVED here (Rename Map step 5). All 8 Options that
    // carried it have a populated `benefits`, verified before removal — the copy the
    // earlier migration made is complete, so the old field held nothing `benefits`
    // does not.

    // `specTables` was removed in PROD-2250 — Decisions D41 deleted Option Group.
    // A spec-table row was always a choice, so it becomes a Property Value
    // (offered through `properties` above); the numbers beside it become `facts`
    // on that Property Value. Never populated, so nothing to migrate. If a number
    // ever differs per Option it returns as a small value→fact list here.

    // Related items.
    // `applicableCustomizations` (an Option→Option allow-list) was removed in
    // PROD-2250 — it was the same relationship the "products only" decision routed
    // exclusively through `incompatibleWith`, expressed in the opposite direction,
    // and it was never in the entity spec. 0/33 options populated it.
    // `comparedAgainst` was retired in D47 §5 / ADR-017 (comparison is content: a guide,
    // written once, linked from both) and REMOVED here on 2026-09-01. Step 5 had kept it
    // read-only because 8 of 33 options were populated and there was no successor field,
    // so removal would be deletion rather than migration. Eric confirmed the deletion:
    // each of the 8 held exactly three REFERENCES to other options — no written content
    // of any kind — and the targets are mock documents due for wholesale replacement.
    // Nothing authored is lost.
    // `relatedCustomizations` ("See also — cross-category links") was hard-removed
    // here in PROD-2250 / D47 §5. Unlike `comparedAgainst` it was populated on 0 of
    // 33 options, so there was no data to keep legible and nothing to deprecate
    // toward. The migration unsets the key on any straggler.
    // Note: `glossaryTerm.relatedCustomizations` is a different field on a different
    // type and is untouched.
    // Restored 2026-08-31 (D48, Eric's schema review). I had deprecated this on the
    // grounds that it was "not in the designed field list" — but that was a SILENCE,
    // not a decision: no D-number ever removed it, and nine other public-page types
    // design `faqs`. Principle Q-D permits it, and both cases genuinely occur —
    // "does lamination affect recyclability?" is shared across all three laminations,
    // "why does Soft Touch scuff?" is not.
    //
    // Uses the shared `faqsField` in `mixed` mode, which is the same call Guide and
    // Post make, so the members match reference-for-reference rather than by
    // reimplementation. ⚠️ The three existing entries were written against an
    // ANONYMOUS object member and carry no `_type`; the migration stamps them
    // `faqItem` so the helper can render them.
    faqsField({ group: 'categorization', mode: 'mixed' }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: 'Overrides the browser/search title. Aim for ≤60 characters.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The search-result snippet. Aim for ≤160 characters.',
      validation: (Rule) => Rule.max(160),
    }),
    // Robots toggles from the one shared definition every other page type uses.
    // This type had meta tags and no way to keep the page out of the index.
    ...seoFields({ group: 'seo', meta: false }),

    // ─── SOCIAL ───────────────────────────────────────────────────────────────

    defineField(taggedImageField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'social',
      mediaTags: ogMediaTags(MEDIA_TAG.customization),
      options: { hotspot: true },
      description: 'Open Graph / social-share image. Falls back to the first media image when empty.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
      ],
    })),
  ],

  // PROD-2462. This block read three fields deleted in PROD-2250 — `category`,
  // `appliesTo` and `except`. A deleted field reads as undefined, and the old code
  // turned "no targets" into the words "applies to all", so EVERY option claimed it
  // applied to everything. The truth is the opposite: 118 of the 120 configurable
  // options have no availability authored, which by that field's own description
  // means offered NOWHERE. It was wrong on 33 documents when filed and on 126 after
  // the Notion import.
  //
  // `category` is not restored — it was retired because `type->category` is the one
  // stored path (PROD-2250), and a preview is not a reason to store a fact twice.
  // The Type alone is enough to place a row.
  preview: {
    select: {
      title: 'title',
      shortName: 'shortName',
      status: 'status',
      type: 'type.title',
      media: 'media.0',
      configuratorRole: 'configuratorRole',
      hasPage: 'hasPage',
    },
    prepare({ title, shortName, status, type, media, configuratorRole, hasPage }) {
      // This used to summarise availability from `availableOnProducts` — "3
      // targets", or "⚠ offered nowhere" when empty. That field is retired
      // (PROD-2529): a Product now states which options it offers, so this
      // document no longer holds the answer, and a preview cannot go and find
      // it — `select` reads fields, and the relationship now points the other
      // way, which takes a reverse lookup.
      //
      // Leaving the summary in place would have printed "⚠ offered nowhere"
      // against 124 of 126 options forever, from a field nobody can write. That
      // is PROD-2462 exactly, and PROD-2528 after it. The Used-by tab answers
      // the question instead, where the reverse lookup is possible.
      const parts = [
        type,
        configuratorRole === 'reference' ? 'reference' : null,
        hasPage ? 'has page' : null,
      ].filter(Boolean)
      const subtitle = parts.join(' · ')

      return {
        // The full Title, not `shortName` — this is the editors' list, and the Title
        // is the name written to keep them apart. A short name is appended only when
        // it is set and actually differs, so an editor can sanity-check the customer
        // label without it competing with the real name. Set on 0 of 126 today.
        title: shortName && shortName !== title ? `${title}  ·  ${shortName}` : title,
        subtitle: status === 'active' ? subtitle : `[${status?.toUpperCase()}] ${subtitle}`,
        media,
      }
    },
  },
  // Crystal works this list a Type at a time (PROD-2544). This puts "Sort by Type" in
  // the list's sort menu; picking it groups the 126 options under their 23 Types, and
  // sorts by name within each. The second `by` entry is that within-group sort, not a
  // second menu option — which is why the label names only the Type.
  //
  // The path is the dotted `type.title`, NOT `type->title`, and the raw-GROQ intuition
  // is backwards here. A bare `order(type.title asc)` really does return unsorted rows
  // — a reference holds `{_ref, _type}` and has no `title` under it. But a sort MENU
  // item does not issue a bare `order()`: `getOrderingMenuItemsForSchemaType` runs
  // `getExtendedProjection` over this `by` array, which walks the path against the
  // schema, sees `type` is a reference, and emits `type->{title}`. That rides along on
  // the menu item, so the query becomes
  //
  //   *[...]{_id, _type, type->{title}} | order(type.title asc)[0...$__limit]{...}
  //
  // The dereference happens a stage before the sort. `type->title` would not parse into
  // a reference hop at all.
  //
  // ⚠ This ordering CANNOT be used as a list's `.defaultOrdering()`. That extended
  // projection is built for menu items only — `PaneContainer` constructs the default as
  // `{by: defaultOrdering}` with no projection slot, and `DocumentListBuilder.defaultOrdering`
  // accepts a bare `SortOrderingItem[]`, so there is nowhere to put one. A reference sort
  // set as a default silently degrades to whatever the next key is. The Options list in
  // `structure/index.ts` therefore defaults to plain `title` and leaves this to the menu.
  //
  // Once picked it persists: `validateSortOrder` returns the sort object intact when every
  // path resolves, and its resolver follows single-target references, so the projection
  // survives into the per-user key-value store and works on every later load. That check
  // rejects MULTI-target references — `type` points only at `customizationType`, so it
  // passes. Same dotted form `propertyValue` already uses for `property.title`.
  //
  // Title is declared explicitly rather than relied on. `getOrderingMenuItemsForSchemaType`
  // builds the menu as `type.orderings.concat(DEFAULT_ORDERING_OPTIONS)`, and in sanity
  // 5.24.0 those built-ins are only Last edited and Created — there is no built-in Title
  // to inherit. Declaring it keeps the menu at four whatever the built-ins do next.
  orderings: [
    {
      title: 'Type',
      name: 'typeTitle',
      by: [
        { field: 'type.title', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
    {
      title: 'Title',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
