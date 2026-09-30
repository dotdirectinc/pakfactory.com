import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'
import { seoFields } from '../lib/seo-fields'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { CompatibleCustomizationsInput } from '../components/CompatibleCustomizationsInput'

/**
 * `appearsIn` values (PROD-2732). Exported so nothing has to re-spell them.
 *
 * 🔴 Both predicates below test for what they WANT, never for what they exclude.
 * An option whose `appearsIn` is unset — an import that has not run the backfill,
 * a document created over the API — must read as "no page, not pickable", so a
 * missing value hides it rather than leaking it. `appearsIn !== 'not-configurable-with-page'`
 * is the same expression for every value that exists today and the OPPOSITE one
 * for a missing value, which would put the six reference options into the
 * configurator as things a customer can order. Same trap as `showOnDetailPage`
 * (PROD-2610) and `customerFacing` (PROD-2620), inverted: here the safe test is `==`.
 */
export const APPEARS_IN = {
  configurableWithPage: 'configurable-with-page',
  notConfigurableWithPage: 'not-configurable-with-page',
  configurableNoPage: 'configurable-no-page',
} as const

/** Does this option have a detail page in the customization library? */
export const hasDetailPage = (appearsIn: unknown): boolean =>
  appearsIn === APPEARS_IN.configurableWithPage ||
  appearsIn === APPEARS_IN.notConfigurableWithPage

/** Does a customer pick this option in the configurator? */
export const isConfigurable = (appearsIn: unknown): boolean =>
  appearsIn === APPEARS_IN.configurableWithPage || appearsIn === APPEARS_IN.configurableNoPage

export const customizationOption = defineType({
  name: 'customizationOption',
  title: 'Customization Option',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content' },
    { name: 'categorization', title: 'Categorization' },
    { name: 'specs', title: 'Specs' },
    { name: 'template', title: 'Template' },
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
      description: 'The customization option name (e.g. "Matte Lamination").',
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
      description: 'A shorter name for swatches, chips and listings. Leave empty to use the Title.',
    }),
    // The house `shortDescription` — same shape as Product, Product Line,
    // Product Style, Solution, Solution Style, Bundle and Blog Category. No
    // character cap on any of them; if one is wanted it belongs on all eight.
    //
    // Not surfaced in `preview`: the subtitle there shows the Type (PROD-2544),
    // and this field is empty on every Option today, so promoting it would
    // trade a useful line for a blank one.
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'One-line summary for the customization card, listings and search results.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description: 'URL-safe identifier, generated from the title. Unique across all customization options.',
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
    // now unfiltered and always visible. That is a real trade — every Type instead of a
    // narrowed handful — taken because the alternative is storing a fact twice to make
    // a picker shorter. Search in the picker covers it.
    defineField({
      name: 'type',
      title: 'Type',
      type: 'reference',
      group: 'content',
      to: [{ type: 'customizationType' }],
      description: 'The customization type this option belongs to. The category follows from it.',
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
        'The industry term this option is an instance of. The definition lives on the Glossary Term — ' +
        'never restate it here.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'content',
      description: 'Lifecycle — Active (offered now), Coming soon or Discontinued.',
      options: {
        layout: 'radio',
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Coming soon', value: 'coming-soon' },
          { title: 'Discontinued', value: 'discontinued' },
        ],
      },
      // ⚠️ PROD-2733 would cut this to Active / Not active, and is NOT in this PR.
      // It is blocked on a content decision, not on code: 123 options on development
      // are coming-soon or discontinued, so removing those values decides what each
      // of them becomes. `appearsIn` above does not depend on the answer — it is
      // required only while an option is `active`, which reads the same under either
      // list.
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    // ─── PROD-2732: `configuratorRole` + `hasPage` MERGED INTO ONE FIELD ──────
    // Two booleans answered one question between them — where a customer meets
    // this option — and an editor had to hold both in their head to know what
    // they got. The grid they spanned, on published production:
    //
    //                    hasPage: true   hasPage: false
    //   configurable          102              18
    //   reference               6               0
    //
    // Three occupied cells, three values. The fourth — a technical option with no
    // page — has no occupants among ACTIVE options; where it does occur it is on
    // retired materials, which is why `appearsIn` is required only while active.
    //
    // ⚠️ THIS IS NOT A RETURN TO `role` (PROD-2482 / D55). That field could not
    // express "pickable AND has a page", which is 102 of 126 — the majority of the
    // catalogue had nowhere to be recorded. Every occupied cell is representable
    // here. The defect was one field carrying two questions whose answers vary
    // independently; this enumerates the combinations that actually occur.
    defineField({
      name: 'appearsIn',
      title: 'Where this appears',
      type: 'string',
      group: 'content',
      description:
        'Which customer-facing surfaces this option appears on. Configurable means a customer ' +
        'picks it in the configurator — Matte, Magnetic Closure. Detail Page means it has its own ' +
        'page in the customization library, with its own photos and explanation; that is an ' +
        'editorial judgement about demand, search value and whether there is enough to say. Most ' +
        'options are both. Pick Not Configurable + Detail Page for a real production process a ' +
        'customer never picks directly, like Matte Lamination, which customers reach through the ' +
        'simplified option it achieves.',
      options: {
        layout: 'radio',
        list: [
          { title: 'Configurable + Detail Page', value: 'configurable-with-page' },
          { title: 'Not Configurable + Detail Page', value: 'not-configurable-with-page' },
          { title: 'Configurable + No Detail Page', value: 'configurable-no-page' },
        ],
      },
      // The labels are formulas on purpose. They are PARALLEL, so the three choices
      // are comparable at a glance and a reader can see which dimension changed.
      // Three sentence-shaped labels destroy that — you have to read all three and
      // reconstruct the pattern. The explanation lives in the description above,
      // which the Studio renders directly over the radio list.
      //
      // The stored values mirror the labels so an editor's choice and a GROQ filter
      // name the same thing, and both page values contain `with-page`, which keeps
      // `appearsIn in [...]` readable as "has a detail page".
      //
      // Stays EDITABLE when status is not active. Not active is now the only
      // pre-launch state there is, so an option is set up while it is off, and this
      // is the setting that says what happens when it comes back on. (`template`
      // below is different and is correctly hidden: with no page there is genuinely
      // nothing to lay out.)
      initialValue: 'configurable-with-page',
      // ─── REQUIRED ONLY WHILE THE OPTION IS ACTIVE ────────────────────────────
      // The three values describe where a CUSTOMER meets this option. On an option
      // no customer can reach, the question does not arise, and forcing an answer
      // would mean writing something untrue.
      //
      // That is not hypothetical. Retiring a technical material — a pouch film, a
      // board — leaves an option that a customer never picked and that never had a
      // page. Neither remaining value fits: one claims a page it does not have, the
      // other claims a customer can pick it. 38 such options exist on development.
      //
      // ❌ DO NOT "fix" this by adding a fourth value for them. Checked, not
      // assumed: ZERO of those options are active. The combination only occurs on
      // things being retired, and a value that can only ever describe documents
      // nobody can reach earns nothing. Leaving the field empty says the same thing
      // and says it honestly.
      //
      // Safe because every reader tests for the value it WANTS — `isConfigurable`,
      // `hasDetailPage`, `HAS_DETAIL_PAGE` — so an empty `appearsIn` reads as "not
      // pickable, no page" everywhere rather than leaking.
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const status = (ctx.document as { status?: string } | undefined)?.status
          if (status !== 'active') return true
          return value
            ? true
            : 'An active option needs to say where it appears. If this one is retired or ' +
                'internal-only, set its Status accordingly and leave this empty.'
        }),
    }),
    defineField({
      name: 'template',
      title: 'Template',
      type: 'reference',
      group: 'template',
      to: [{type: 'customizationDetailPage'}],
      options: {disableNew: true},
      description:
        'Pick a Customization Detail Page layout version — shared bands below the detail chrome. ' +
        'Manage layouts under Main Website → Customization Pages → Customization Detail Pages. ' +
        'Empty → seeded Default layout (`customizationDetailPage`).',
      hidden: ({document}) => !hasDetailPage(document?.appearsIn),
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const doc = ctx.document as {appearsIn?: string} | undefined
          if (!hasDetailPage(doc?.appearsIn)) return true
          return value
            ? true
            : 'Options with a page should select a Customization Detail Page layout'
        }).warning(),
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
        'Which other customizations can be ordered with this one. Recording it on either option is ' +
        'enough. Empty means none are compatible.',
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
        // A page-only option is a library page, never something a customer picks,
        // so an entry naming one is inert rather than wrong. It is not reachable
        // through the picker at all — only a script, or changing an option's
        // `appearsIn` AFTER this was authored. Never auto-cleared: a field switch
        // that silently edits data is worse than one that says something.
        Rule.custom(async (value, context) => {
          const refs = (value as { _ref?: string }[] | undefined) ?? []
          const ids = refs.map((r) => r._ref?.replace(/^drafts\./, '')).filter(Boolean) as string[]
          if (ids.length === 0) return true
          try {
            const client = context.getClient({ apiVersion: '2024-01-01' })
            // Names the one value that is not pickable rather than listing the two
            // that are: an option with `appearsIn` unset is then NOT flagged, which
            // is the right way round for a warning — it cannot accuse a document of
            // something the backfill simply has not reached yet.
            const rows = await client.fetch<{ _id: string; title: string | null }[]>(
              `*[_id in $ids && appearsIn == "not-configurable-with-page"]{ _id, title }`,
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
        'Not Configurable options only: which customer-facing option this one can deliver. E.g. ' +
        'Matte Lamination achieves Matte. Listing it here does not claim this one is enough ' +
        'on its own — the actual combination is decided at quoting.',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const list = Array.isArray(value) ? value : []
          if (list.length === 0) return true
          const appearsIn = (context.document as { appearsIn?: string } | undefined)?.appearsIn
          // Tests for the two Configurable values rather than "not the page-only
          // one", so an option whose `appearsIn` is unset is not warned about.
          if (isConfigurable(appearsIn)) {
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
        'The property values on this option. For a property its type marks Stated, these are facts about ' +
        'the option. For one marked Selectable, these are the choices a customer picks one from. The ' +
        'choices come from its customization type — if this is empty, add the property to the type first.',
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
      // One check, adapted from the Product side in PROD-2539: a value whose
      // property this option's Type never declared.
      //
      // The second check — more values than `valuesPerItem` allowed — went with
      // that field in PROD-2585. It had only ever applied to STATED properties,
      // because a SELECTABLE one makes this list the menu a customer picks from
      // rather than a claim about the option. That distinction still governs how
      // an editor READS this list; it no longer governs how it validates.
      //
      // Warning, not error: an editor opening an option cannot always fix data
      // that arrived before the picker filter existed, and two options are in
      // exactly that state today.
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
            declared: { ref: string | null }[] | null
            values:
              | {
                  _id: string
                  title: string | null
                  propRef: string | null
                  propTitle: string | null
                }[]
              | null
          }>(
            `{
              "declared": *[_id == $typeRef][0].properties[]{ "ref": property._ref },
              "values": *[_id in $refs]{
                _id, title,
                "propRef": property._ref,
                "propTitle": property->title
              }
            }`,
            { typeRef, refs },
          )

          const declaredList = declared ?? []
          const valueList = values ?? []
          const declaredRefs = new Set(declaredList.map((d) => d.ref))
          const problems: string[] = []

          // The flat array carries no grouping, so it is grouped here: the
          // Product side stores one row per property and gets this for free.
          const byProperty = new Map<string, { title: string; names: string[] }>()
          for (const v of valueList) {
            if (!v.propRef) continue
            const group = byProperty.get(v.propRef) ?? {
              title: v.propTitle ?? 'This property',
              names: [],
            }
            group.names.push(v.title ?? 'Untitled value')
            byProperty.set(v.propRef, group)
          }

          // A property the Type never declared. Silent when the Type declares
          // nothing: that is an unfinished Type, not a wrong option.
          if (declaredList.length) {
            for (const [ref, group] of byProperty) {
              if (declaredRefs.has(ref)) continue
              problems.push(
                `${group.title} is not declared by this customization type — remove ${group.names.join(', ')}, or add the property to the type.`,
              )
            }
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
        'Why a customer would pick this. Argue the choice — the definition belongs on the Glossary Term.',
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
      description: 'Overrides the browser and search title. Best kept under 60 characters.',
      validation: (Rule) => Rule.max(60).warning('Best kept under 60 characters.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The snippet shown under the title in search results. Best kept under 160 characters.',
      validation: (Rule) => Rule.max(160).warning('Best kept under 160 characters.'),
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
      description: 'Shown when this option is shared. 1200×630. Falls back to the first media image.',
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
      appearsIn: 'appearsIn',
    },
    prepare({ title, shortName, status, type, media, appearsIn }) {
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
      // Says what an option IS, in the same words as the field's own labels, so a
      // row in this list and the radio on the form read the same. An unset
      // `appearsIn` prints neither part rather than guessing at one.
      const parts = [
        type,
        appearsIn && !isConfigurable(appearsIn) ? 'not configurable' : null,
        appearsIn && !hasDetailPage(appearsIn) ? 'no page' : null,
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
  // the list's sort menu; picking it groups the options under their Types, and
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
