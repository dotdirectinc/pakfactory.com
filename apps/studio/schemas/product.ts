import { defineField, defineType } from 'sanity'
import { PackageIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField, taggedImageType } from '../lib/media-tags'
import { DIMENSION_INPUTS, AXIS_LABEL, usesAxis, type DimensionAxis } from '@pakfactory/sanity/dimension-inputs'
import { seoFields, socialFields } from '../lib/seo-fields'
import { PRODUCT_URL_TYPES, uniqueSlugAcross } from '../lib/slug-rules'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'
import { AvailableCustomizationsInput } from '../components/AvailableCustomizationsInput'

/**
 * Product — one orderable thing: a fully-configurable `standard` product or a
 * pre-configured `inspiration` preset (Entities/Product.md). The type every
 * factual field lands on — nothing inherits from Line or Style.
 *
 * All 26 documents are mock data due for re-seeding, so this is a rebuild to
 * spec, not a migration: retired fields are deprecated (schema-on-read keeps the
 * mock data legible until the re-seed), and the line/style single references
 * replace the old arrays. The re-seed produces correct-shaped documents.
 *
 * Source-owned fields (sku, status, moq, leadTimeDays, dimensionRange,
 * properties, availableCustomizations, productLine, productStyle) are marked but
 * kept EDITABLE — decision b, PROD-2295: they flip to readOnly when the
 * Registry/SPECs system ships.
 *
 * `sections` (page-builder) is confirmed needed but deferred until the shared
 * section inventory exists (PROD-2292).
 */

const SOURCE_OWNED_NOTE =
  'Owned by the product data source. Editable for now, read-only once that source is live.'

const kindOf = (doc: unknown): string | undefined => (doc as { kind?: string } | undefined)?.kind
const isStandard = (doc: unknown) => kindOf(doc) === 'standard'
const isInspiration = (doc: unknown) => kindOf(doc) === 'inspiration'

/**
 * Min/max number pair per measurement axis, each shown only when the product's
 * `dimensionInput` shape actually uses it — so a Cylinder shows Diameter and
 * Height, and nothing else.
 */
const DIMENSION_AXIS_FIELDS = (['length', 'width', 'height', 'diameter', 'gusset', 'drop'] as DimensionAxis[])
  .flatMap((axis) =>
    (['Min', 'Max'] as const).map((bound) =>
      defineField({
        name: `${axis}${bound}`,
        title: `${AXIS_LABEL[axis]} ${bound.toLowerCase()} (mm)`,
        type: 'number',
        hidden: ({ document }) => !usesAxis(document?.dimensionInput as string | undefined, axis),
      }),
    ),
  )

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  icon: PackageIcon,
  groups: groupsFor(['content', 'categorization', 'sections', 'specs', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'The canonical name (e.g. "Custom Magnetic Closure Boxes").',
      validation: (Rule) => Rule.required(),
    }),
    // One naming convention across Line / Style / Solution / Product: Title is
    // the canonical name, H1 is the page heading, Short name is the card and nav
    // label. Both overrides fall back to Title when empty, so an editor who
    // leaves them alone gets the right string everywhere.
    defineField({
      name: 'h1',
      title: 'H1',
      type: 'string',
      group: GROUPS.content,
      description: 'The heading on this page. Leave empty to use the Title.',
    }),
    defineField({
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      group: GROUPS.content,
      description:
        'A shorter label for cards, listings and nav. Leave empty to use the Title.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      options: { source: 'title' },
      description: 'The /products/<slug> segment. Must be unique across products and product lines.',
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(PRODUCT_URL_TYPES)),
    }),
    defineField({
      name: 'kind',
      title: 'Product type',
      type: 'string',
      group: GROUPS.content,
      description:
        'Standard = fully configurable by the customer. Inspiration = pre-configured, with some customizations already chosen. A bundle is its own document type, not a value here.',
      options: {
        layout: 'radio',
        list: [
          { title: 'Standard', value: 'standard' },
          { title: 'Inspiration', value: 'inspiration' },
        ],
      },
      initialValue: 'standard',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: GROUPS.content,
      description: `Lifecycle — Active, Coming soon or Discontinued. Never unpublishes the product. ${SOURCE_OWNED_NOTE}`,
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
    defineField({
      name: 'customerFacing',
      title: 'Customer facing',
      type: 'boolean',
      group: GROUPS.content,
      description:
        'Off = no page, no route, no listing; the document exists only to be referenced. Not the same as Status — this one decides whether a page exists at all.',
      initialValue: true,
      // WARNING, never an error. A customer-facing product under a hidden line or
      // style is the one rule a human can break silently: nothing in the Studio shows
      // an ancestor's visibility while you edit the child, and the result is a page
      // whose whole path above it is unreachable. Everything else about the scaffold
      // pattern is enforced structurally.
      //
      // Warning and not error because the state is legitimate mid-edit — you unhide a
      // line and its products one save at a time — and because an error here would
      // block publishing a product over the state of a DIFFERENT document.
      //
      // Reads the PUBLISHED ancestors deliberately: a strong reference resolves
      // against the published dataset, so published visibility is what decides
      // whether a route can exist. An unpublished draft edit is not yet that fact.
      validation: (Rule) =>
        Rule.custom(async (value, context) => {
          if (value === false) return true
          const doc = context.document as
            | { kind?: string; productLine?: { _ref?: string }; productStyle?: { _ref?: string }[] }
            | undefined
          // Only a standard product has a line/style ancestry; both are hidden on presets.
          if (doc?.kind !== 'standard') return true
          const refs = [doc.productLine?._ref, ...(doc.productStyle ?? []).map((r) => r?._ref)].filter(
            (r): r is string => Boolean(r),
          )
          if (refs.length === 0) return true
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const hidden = await client.fetch<{ title?: string }[]>(
            `*[_id in $refs && customerFacing == false]{title}`,
            { refs },
          )
          if (hidden.length === 0) return true
          const names = hidden.map((h) => h.title ?? 'untitled').join(', ')
          return `This product is customer facing, but ${names} ${
            hidden.length === 1 ? 'is not' : 'are not'
          }. The product page would sit under a path with no reachable route above it.`
        }).warning(),
    }),
    // One representative image, one gallery — the same pair on Product Line and
    // Product Style. `featuredImage` replaces the old positional rule, where the
    // first gallery image silently doubled as the card: reordering a gallery is a
    // presentation decision and should never change which image represents the
    // product.
    defineField(taggedImageField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'image',
      group: GROUPS.content,
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description: 'The one image that represents this product — cards, listings, nav and the social fallback. Not part of the gallery.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' })],
    })),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: GROUPS.content,
      description: 'Additional images for this page. Order is presentation only — the card and social images come from Featured image.',
      of: [taggedImageType([MEDIA_TAG.product], { hotspot: true })],
    }),
    // Renamed from `description` (PROD-2454) — the field was already
    // *labelled* "Short description" but *named* `description`; the name now
    // says what the label always said.
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      group: GROUPS.content,
      rows: 3,
      description: 'One-line summary for the product card and listings.',
    }),
    // The `description` key was freed by PROD-2455 and reused for the
    // long-form field, matching Line and Solution. Starts empty everywhere.
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: GROUPS.content,
      description:
        'What this product is, how it is built and what it suits.',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
          },
        },
      ],
    }),

    // ─── CATEGORIZATION (classification refs + curated lists) ─────────────────
    // Cardinality confirmed with Richard 2026-08-27, before the product data source
    // begins populating: a product belongs to exactly ONE Product Line, but may take
    // SEVERAL Styles within that line. So `productLine` is a single reference and
    // `productStyle` stays an array — the asymmetry is the decision, not an oversight.
    //
    // POSITION IS MEANINGFUL on `productStyle` (settled 2026-08-27). The registry
    // resolves a product's offer set from ONE style — `product.style_id`, its
    // `is_primary` link — and this array has no primary flag to map onto. The rule
    // is positional: **`productStyle[0]` is the primary.** That is already what both
    // sides do (the importer takes `multi(...)[0]`, and `is_primary` is backfilled
    // from `style_id`); it simply had never been stated.
    //
    // The consequence is editor-facing, which is why the description says so:
    // dragging this array changes which style the offer set resolves from. Today
    // that is harmless — the styles on a product are compatible, so primary-only and
    // union agree — but that is a property of the current data, not of the model.
    // `app.v_style_disagreement` in the registry reports the first case where two
    // linked styles genuinely contradict each other, which is when the deferred
    // union / intersection / primary-only ruling becomes due.
    //
    // This supersedes the earlier "a product can span more than one line" comment,
    // which came from reading Crystal's design as symmetric across both levels. It is
    // also narrower than `Entities/Product.md`, which says Single for BOTH — the Style
    // half of that spec is what changed.
    //
    // Verified lossless on production before the change: of 26 products, 0 sat in more
    // than one line and 0 in more than one style.
    defineField({
      name: 'productLine',
      title: 'Product line',
      type: 'reference',
      group: GROUPS.categorization,
      to: [{ type: 'productLine' }],
      options: { disableNew: true },
      description: `The product line this product belongs to — exactly one. Required for standard products. ${SOURCE_OWNED_NOTE}`,
      hidden: ({ document }) => isInspiration(document),
      validation: (Rule) =>
        Rule.custom((val, context) => {
          if (isStandard(context.document) && !val) return 'A product line is required for standard products.'
          return true
        }),
    }),
    defineField({
      name: 'productStyle',
      title: 'Product styles',
      type: 'array',
      group: GROUPS.categorization,
      description: `The construction style(s) — a product may have more than one, but all within its single product line. The first one is the primary: the product data source uses it to work out what the product can be ordered with, so reordering this list changes that. At least one for standard products. ${SOURCE_OWNED_NOTE}`,
      hidden: ({ document }) => isInspiration(document),
      of: [
        {
          type: 'reference',
          to: [{ type: 'productStyle' }],
          options: {
            disableNew: true,
            // Scoped to the ONE chosen line. Before the cardinality change this read
            // `productLine._ref in $refs` off an array of lines; with a single line it
            // is a direct match, which is also why a style can no longer be picked
            // from a line the product does not belong to.
            filter: ({ document }: { document: { productLine?: { _ref?: string } } }) => {
              const ref = document?.productLine?._ref
              if (!ref) return { filter: 'false' }
              return { filter: 'productLine._ref == $ref', params: { ref } }
            },
          },
        },
      ],
      validation: (Rule) =>
        Rule.custom((val, context) => {
          const arr = val as unknown[] | undefined
          if (isStandard(context.document) && (!Array.isArray(arr) || arr.length === 0))
            return 'At least one product style is required for standard products.'
          return true
        }),
    }),
    defineField({
      name: 'basedOn',
      title: 'Based on',
      type: 'reference',
      group: GROUPS.categorization,
      to: [{ type: 'product' }],
      options: {
        disableNew: true,
        filter: 'kind == "standard"',
      },
      description: 'The standard product this inspiration product is built from. It cannot point at another inspiration product.',
      hidden: ({ document }) => isStandard(document),
      validation: (Rule) =>
        Rule.custom((val, context) => {
          if (isInspiration(context.document) && !val) return 'Required for inspiration presets.'
          return true
        }),
    }),
    defineField({
      name: 'solutions',
      title: 'Solutions',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Which solutions this product serves — industry, channel, focus or use case. The first entry is the primary and names the breadcrumb parent, so drag to change which one leads. Required for inspiration products.',
      of: [{ type: 'reference', to: [{ type: 'solution' }], options: { disableNew: true } }],
      validation: (Rule) =>
        Rule.unique().custom((val, context) => {
          const list = Array.isArray(val) ? val : []
          if (isInspiration(context.document) && list.length === 0)
            return 'At least one solution is required for inspiration presets — the first names the breadcrumb parent.'
          return true
        }),
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override. Empty falls back to a derived list.',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
    }),
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SPECS (source-owned facts — editable for now, decision b) ────────────
    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      group: GROUPS.specs,
      description: `Required, unique. Issued by the product data source; no format rule in Sanity. ${SOURCE_OWNED_NOTE}`,
      validation: (Rule) =>
        Rule.required().custom(async (sku, context) => {
          if (!sku) return true
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const id = (context.document as { _id?: string })?._id?.replace(/^drafts\./, '') ?? ''
          const dupe = await client.fetch<boolean>(
            `count(*[_type == "product" && sku == $sku && !(_id in [$id, $draftId])]) > 0`,
            { sku, id, draftId: `drafts.${id}` },
          )
          return dupe ? 'SKU must be unique.' : true
        }),
    }),
    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: GROUPS.specs,
      description: `Every property value this product states — the picker offers only what this product's line declares, so an empty picker means the property has to be added to the line first. Nothing inherits from Line or Style. ${SOURCE_OWNED_NOTE}`,
      of: [
        {
          type: 'object',
          name: 'productProperty',
          fields: [
            defineField({
              name: 'property',
              title: 'Property',
              type: 'reference',
              to: [{ type: 'property' }],
              // Scoped to what the product's Line declared, exactly as an Option's
              // picker is scoped by its Type's declaration. Without this the
              // declaration was decorative — every Property was offered on every
              // product, so a rigid box could state a flute and nothing objected.
              //
              // An inspiration preset has no Line of its own (`productLine` is
              // required for standard products only), so it resolves through
              // `basedOn` to the standard product it is built from. 58 of 336
              // products are in that position — not an edge case worth skipping.
              //
              // Declaring nothing offers nothing, deliberately: the fix is to
              // declare the property on the Line, never to widen the picker.
              options: {
                disableNew: true,
                filter: ({ document }) => {
                  const doc = document as
                    | { productLine?: { _ref?: string }; basedOn?: { _ref?: string } }
                    | undefined
                  const lineRef = doc?.productLine?._ref
                  if (lineRef) {
                    return {
                      filter: '_id in *[_id == $lineRef][0].properties[].property._ref',
                      params: { lineRef },
                    }
                  }
                  const basedOnRef = doc?.basedOn?._ref
                  if (basedOnRef) {
                    return {
                      filter:
                        '_id in *[_id == *[_id == $basedOnRef][0].productLine._ref][0].properties[].property._ref',
                      params: { basedOnRef },
                    }
                  }
                  // No line and nothing to inherit one from: there is no
                  // declaration to scope by, so offer nothing rather than everything.
                  return { filter: 'false' }
                },
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'values',
              title: 'Values',
              type: 'array',
              description: 'The value(s) this product states for the property.',
              of: [
                {
                  type: 'reference',
                  to: [{ type: 'propertyValue' }],
                  options: {
                    disableNew: true,
                    // Keyed off `document`, like every other filter here, and NOT
                    // off `parent`. For a reference that is an array member,
                    // `parent` is the `values` ARRAY rather than the row holding
                    // the Property — ReferenceFilterResolverContext types it
                    // `Record<string, unknown> | Record<string, unknown>[]` for
                    // exactly this case. So `parent.property` was always
                    // undefined, the filter was always 'false', and no value was
                    // ever selectable. That is why the one populated row in the
                    // dataset names a property and holds no values: the picker
                    // could not be used, not that nobody tried.
                    //
                    // The row is found from the path instead — properties[_key].values.
                    filter: ({ document, parentPath }) => {
                      const rowKey = (parentPath ?? []).find(
                        (segment): segment is { _key: string } =>
                          typeof segment === 'object' &&
                          segment !== null &&
                          '_key' in segment,
                      )?._key
                      const rows = (
                        document as
                          | { properties?: { _key?: string; property?: { _ref?: string } }[] }
                          | undefined
                      )?.properties
                      const ref = rows?.find((row) => row?._key === rowKey)?.property?._ref
                      if (!ref) return { filter: 'false' }
                      return { filter: 'property._ref == $ref', params: { ref } }
                    },
                  },
                },
              ],
              validation: (Rule) => Rule.unique(),
            }),
          ],
          preview: {
            // `values.length` reads like it works and never has: preview `select`
            // resolves field PATHS, not expressions, so it looked for a field
            // called `length` on the array, found nothing, and every row read
            // "No values" however many it actually held. The array itself comes
            // back intact, so it is counted here instead.
            select: { title: 'property.title', values: 'values' },
            prepare({ title, values }) {
              const count = Array.isArray(values) ? values.length : 0
              return {
                title: title || 'Property',
                subtitle: count ? `${count} value${count === 1 ? '' : 's'}` : 'No values',
              }
            },
          },
        },
      ],
      // The other half of the Line's declaration. `productLine.properties[]`
      // flags each entry `required`, and until now nothing read that flag — the
      // only two occurrences of the word in the repo were its own help strings.
      //
      // WARNING, not error, for two reasons that both matter. These values are
      // written by the product data source over the API, where the picker filter
      // above has no effect whatsoever; an editor opening a synced product cannot
      // fix what the sync produced, and blocking the save would strand them with
      // a document they are not the author of. And requiredness is set on the
      // Line by one person while the block would land on a Product edited by
      // another.
      //
      // One fetch, three findings, one message: `custom` returns a single result,
      // and splitting this into three rules would mean three round trips.
      validation: (Rule) =>
        Rule.custom(async (value, context) => {
          const rows = Array.isArray(value)
            ? (value as { property?: { _ref?: string }; values?: unknown[] }[])
            : []
          const doc = context.document as
            | { productLine?: { _ref?: string }; basedOn?: { _ref?: string } }
            | undefined
          const statedRefs = rows
            .map((row) => row?.property?._ref)
            .filter((ref): ref is string => Boolean(ref))

          const lineRef = doc?.productLine?._ref ?? ''
          const basedOnRef = doc?.basedOn?._ref ?? ''
          if (!lineRef && !basedOnRef && statedRefs.length === 0) return true

          const client = context.getClient({ apiVersion: '2024-01-01' })

          // Every half in one round trip. A preset resolves its declaration
          // through `basedOn`, the same fallback the picker above uses. Every
          // filter is `_id ==` or `_id in`, so this stays index-backed.
          const { declared, stated } = await client.fetch<{
            declared: { ref: string | null; title: string | null; required: boolean | null }[] | null
            stated: { _id: string; title: string | null }[] | null
          }>(
            `{
              "declared": coalesce(
                *[_id == $lineRef][0].properties,
                *[_id == *[_id == $basedOnRef][0].productLine._ref][0].properties,
                []
              )[]{ "ref": property._ref, "title": property->title, required },
              "stated": *[_id in $statedRefs]{ _id, title }
            }`,
            { lineRef, basedOnRef, statedRefs },
          )

          const declaredList = declared ?? []
          const titleOf = new Map((stated ?? []).map((p) => [p._id, p.title ?? 'Untitled property']))
          const statedSet = new Set(statedRefs)
          const problems: string[] = []

          // 1 — a required declaration with nothing stated against it.
          const missing = declaredList
            .filter((d) => d.required && d.ref && !statedSet.has(d.ref))
            .map((d) => d.title ?? 'Untitled property')
          if (missing.length) {
            problems.push(
              `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required by this product line but not stated here.`,
            )
          }

          // 2 — something stated that the line never declared. Silent when the
          // line declares nothing at all: that is an unfinished line rather than
          // a wrong product, and flagging it would fire on every product in it.
          if (declaredList.length) {
            const declaredRefs = new Set(declaredList.map((d) => d.ref))
            const undeclared = statedRefs
              .filter((ref) => !declaredRefs.has(ref))
              .map((ref) => titleOf.get(ref) ?? 'Untitled property')
            if (undeclared.length) {
              problems.push(
                `${[...new Set(undeclared)].join(', ')} ${undeclared.length === 1 ? 'is' : 'are'} not declared by this product line — add the property to the line, or remove it here.`,
              )
            }
          }

          // 3 — a row that names a property and states no value for it says
          // nothing at all, and reads as a filled-in row at a glance.
          const empty = rows
            .filter((row) => row?.property?._ref && !(row.values ?? []).length)
            .map((row) => titleOf.get(row.property!._ref!) ?? 'Untitled property')
          if (empty.length) {
            problems.push(
              `${[...new Set(empty)].join(', ')} ${empty.length === 1 ? 'has' : 'have'} no value.`,
            )
          }


          return problems.length ? problems.join(' ') : true
        }).warning(),
    }),
    defineField({
      name: 'availableCustomizations',
      title: 'Available customizations',
      type: 'array',
      group: GROUPS.specs,
      // The picker draws only the Customization Types that say the product
      // decides them (`availabilityDecidedBy`, PROD-2532), and this array holds
      // every category — so it patches by `_key` and never writes the array
      // whole. Anything it cannot edit it still lists, at the bottom, rather
      // than leaving it somewhere an editor cannot see it. PROD-2529.
      components: { input: AvailableCustomizationsInput },
      description: `Reads differently by Product type. On a standard product: what it offers. On an inspiration product: which options are already chosen — it offers whatever the product in "Based on" offers, so only the pre-selections are stored here. Which options appear at all is set on each Customization Type, under "Who decides whether a product offers these options?" — a Type answering "Another Customization" does not appear, and nor does an option that only has a library page. ${SOURCE_OWNED_NOTE}`,
      // Two rules, two levels. A repeated option is always a mistake, so it is an
      // error. A pre-selected flag on a Standard product is inert rather than
      // wrong — warn, and do not clear it: a field switch that silently edits
      // data is worse than one that says something.
      validation: (Rule) => [
        Rule.custom((value) => {
          const list = Array.isArray(value) ? value : []
          const seen = new Set<string>()
          const repeated = new Set<string>()
          for (const entry of list as { customization?: { _ref?: string } }[]) {
            const ref = entry?.customization?._ref
            if (!ref) continue
            if (seen.has(ref)) repeated.add(ref)
            seen.add(ref)
          }
          if (repeated.size > 0) {
            return `${repeated.size} customization option(s) appear more than once. Each option should be listed at most once.`
          }
          return true
        }),
        Rule.custom((value, context) => {
          const list = Array.isArray(value) ? value : []
          const flagged = (list as { preselected?: boolean }[]).filter((e) => e?.preselected === true).length
          if (flagged === 0 || !isStandard(context.document)) return true
          return `${flagged} option(s) are marked pre-selected, but this is a Standard product. Pre-selection only has an effect on an Inspiration preset — either clear the flags or change Kind.`
        }).warning(),
        // A preset offers what the box it is built from offers, and no more —
        // both kinds carry the same available set, the preset just arrives with
        // some choices already made. The picker enforces this by only drawing
        // the base's options, but a script or a push from the product data
        // source does not go through the picker, so the rule has to exist here
        // as well as in the UI.
        //
        // A warning, not an error: the two documents can legitimately be written
        // in either order, and failing a preset because its base has not landed
        // yet would break a correct import halfway through.
        Rule.custom(async (value, context) => {
          const list = Array.isArray(value) ? value : []
          if (list.length === 0) return true
          const doc = context.document as { kind?: string; basedOn?: { _ref?: string } } | undefined
          if (doc?.kind !== 'inspiration') return true
          const baseRef = doc?.basedOn?._ref
          if (!baseRef) return true
          try {
            const client = context.getClient({ apiVersion: '2024-01-01' })
            const offered = await client.fetch<string[] | null>(
              `coalesce(*[_id == "drafts." + $baseRef][0], *[_id == $baseRef][0]).availableCustomizations[].customization._ref`,
              { baseRef },
            )
            const allowed = new Set(offered ?? [])
            const stray = (list as { customization?: { _ref?: string } }[]).filter(
              (e) => e?.customization?._ref && !allowed.has(e.customization._ref),
            ).length
            if (stray > 0) {
              return `${stray} option(s) here are not offered by the product this preset is based on. A preset cannot offer what the box it is built from cannot be made with — add them to the base product first, or remove them here.`
            }
          } catch {
            return true // never block on a lookup failure
          }
          return true
        }).warning(),
        // An option that is a library page rather than a configurator choice.
        // The picker cannot produce one, so this only fires on a script write or
        // on an option flipped to `reference` AFTER a product listed it.
        //
        // Warning, not error: the entry is inert rather than wrong — nothing
        // renders it — and it is never auto-cleared, because a field switch that
        // silently edits data is worse than one that says something. Same call
        // as the pre-selected flag surviving a Kind switch, two rules above.
        Rule.custom(async (value, context) => {
          const list = Array.isArray(value) ? value : []
          const ids = (list as { customization?: { _ref?: string } }[])
            .map((e) => e?.customization?._ref?.replace(/^drafts\./, ''))
            .filter(Boolean) as string[]
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
            return `${names} ${one ? 'is' : 'are'} not something a customer picks in the configurator — ${one ? 'it has' : 'they have'} a library page instead, so listing ${one ? 'it' : 'them'} here has no effect.`
          } catch {
            return true // never block on a lookup failure
          }
        }).warning(),
      ],
      of: [
        {
          type: 'object',
          name: 'availableCustomization',
          fields: [
            defineField({
              name: 'customization',
              title: 'Customization option',
              type: 'reference',
              to: [{ type: 'customizationOption' }],
              options: { disableNew: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'preselected',
              title: 'Pre-selected',
              type: 'boolean',
              description: 'Shown as already chosen on an inspiration product. A customer can still change it.',
              initialValue: false,
            }),
          ],
          preview: {
            select: { title: 'customization.title', preselected: 'preselected' },
            prepare({ title, preselected }) {
              return { title: title || 'Customization', subtitle: preselected ? 'Pre-selected' : 'Available' }
            },
          },
        },
      ],
    }),
    // The shape a customer measures this product in. It drives two things from one
    // value: which min/max pairs appear on `dimensionRange` below, and how many
    // input boxes the PDP renders. The map lives in @pakfactory/sanity so the
    // front end reads the same list — a second copy is how "Gusset" ends up
    // meaning two things.
    //
    // ⚠️ The shape is NOT derivable from its axes. Rectangular, Triangular,
    // Hexagonal and Custom Shaped are all L×W×H — same boxes, different product,
    // different page copy. So the shape is stored and the axes are read off it,
    // never the reverse.
    defineField({
      name: 'dimensionInput',
      title: 'Dimension input',
      type: 'string',
      group: GROUPS.specs,
      description:
        'How this product is measured. Decides which measurements appear below, and which boxes a customer fills in on the product page. "No Shape" means it takes no dimensions at all.',
      options: { list: DIMENSION_INPUTS.map(({ value, title }) => ({ value, title })) },
      initialValue: 'rectangular',
    }),
    defineField({
      name: 'dimensionRange',
      title: 'Dimension range',
      type: 'object',
      group: GROUPS.specs,
      description: `Min / max for each measurement this shape takes, in millimetres — always. Set Dimension input above first; only that shape's measurements are shown. ${SOURCE_OWNED_NOTE}`,
      options: { collapsible: true, collapsed: false },
      // Only the axes the chosen shape uses. `hidden` is per-field rather than a
      // filtered list because Sanity needs a stable field set: a value already
      // stored on a now-hidden axis is preserved, not silently dropped.
      fields: DIMENSION_AXIS_FIELDS,
      hidden: ({ document }) => (document?.dimensionInput as string) === 'no-shape',
    }),
    defineField({
      name: 'moq',
      title: 'MOQ',
      type: 'number',
      group: GROUPS.specs,
      description: `This product's own minimum order quantity, in units. Not an override. ${SOURCE_OWNED_NOTE}`,
    }),
    defineField({
      name: 'leadTimeDays',
      title: 'Lead time (days)',
      type: 'number',
      group: GROUPS.specs,
      description: `This product's own production lead time, in days. ${SOURCE_OWNED_NOTE}`,
    }),

    // ─── SEO / SOCIAL ─────────────────────────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: GROUPS.seo,
      description: 'Overrides the browser and search title. Best kept under 60 characters.',
      validation: (Rule) => Rule.max(60).warning('Best kept under 60 characters.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: GROUPS.seo,
      description: 'The snippet shown under the title in search results. Best kept under 160 characters.',
      validation: (Rule) => Rule.max(160).warning('Best kept under 160 characters.'),
    }),
    pageSectionsField(SECTION_ALLOW.productPage),
    ...seoFields({ group: GROUPS.seo, meta: false, canonical: true, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.product }),
  ],

  preview: {
    select: { title: 'title', sku: 'sku', status: 'status', kind: 'kind', media: 'media.0' },
    prepare({ title, sku, status, kind, media }) {
      const badge = status && status !== 'active' ? `[${status.toUpperCase()}] ` : ''
      return {
        title: title || 'Untitled product',
        subtitle: `${badge}${sku ?? 'no SKU'} · ${kind ?? ''}`.trim(),
        media,
      }
    },
  },
})
