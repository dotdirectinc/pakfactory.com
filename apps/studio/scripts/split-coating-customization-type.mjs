/**
 * Split the `Coating` Customization Type in two (PROD-2250, D47 / ADR-017).
 *
 * Eric's `Capabilities Flow` diagram (2026-08-26) shows two Types where Sanity has one:
 *
 *   Spot Coating     no badge  → its Options are `configurable`
 *                              Spot UV/Spot Gloss, Spot Glitter, Raised/Textured Spot UV
 *   Surface Coating  "Not Customizable" → its Options are `reference`
 *                              UV, AQ (Aqueous), Varnish, Soft-Touch, Metallic Sheen…
 *
 * One Sanity `Coating` Type holds both, so `role` currently has to be enumerated
 * per-Option (see REFERENCE_SLUGS in backfill-customization-option-role.mjs) instead of
 * following from the Type. This script makes the Type the unit of classification again:
 *
 *   1. `type-coating-r2304` is RENAMED in place — "Coating" → "Surface Coating",
 *      slug `coating` → `surface-coating`. Renaming rather than recreating keeps the
 *      three Options that stay put (UV / Aqueous / Varnish Coating) pointing at the
 *      same document, so no reference is rewritten for them.
 *   2. `type-spot-coating-r2304` is CREATED — "Spot Coating", slug `spot-coating`,
 *      same Finishes category, same `order: 2` so the two sit together (Embossing and
 *      Lamination already share `order: 1`, so a tie is the existing convention).
 *   3. The `Spot UV` Option is REPOINTED at the new Type.
 *
 * Safe to rename the slug: `customizationType.slug` appears in no route and no GROQ
 * query. `/capabilities/**` resolves through `customizationCategory` — see
 * CAPABILITY_BY_CATEGORY_AND_SLUG_QUERY and resolve-document-href.ts, which build
 * `/capabilities/{category}/{slug}` from the CATEGORY document. No redirect is needed,
 * and none is auto-created (the Studio's slug-change document action does not run for
 * a scripted patch).
 *
 * Verified against the production dataset 2026-08-26: exactly four Options reference
 * `type-coating-r2304` — Aqueous Coating, Spot UV, UV Coating, Varnish Coating — and
 * nothing else in any document type does. Neither "Spot Coating" nor "Surface Coating"
 * collides with an existing taxonomy title (`uniqueTaxonomyTitle` is enforced on
 * `customizationType.title`).
 *
 * Idempotent: every step checks current state first, so a second run is a no-op.
 * Drafts are patched alongside their published documents — publishing a stale draft
 * would otherwise restore the old title, slug, or type reference.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run split:coating-type
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run split:coating-type -- --apply
 *   NEXT_PUBLIC_SANITY_DATASET=production  pnpm --filter @pakfactory/studio run split:coating-type -- --apply
 *
 * ⚠️  The development dataset is nightly-synced from production, so a dev-only apply is
 * wiped overnight. Run development first to verify, then production to make it stick.
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token cannot --apply.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const apply = process.argv.includes('--apply')

const COATING_ID = 'type-coating-r2304'
const SPOT_ID = 'type-spot-coating-r2304'
const FINISHES_CATEGORY_ID = 'cat-finishes-r2304'

/** Option slugs that move from the old `Coating` Type to the new `Spot Coating` Type. */
const SPOT_OPTION_SLUGS = ['spot-uv']

const SURFACE_COATING = {
  title: 'Surface Coating',
  slug: 'surface-coating',
  description:
    'Coatings applied across the whole printed surface — aqueous, UV, and varnish. Not picked in the configurator; a customer reaches these through the Surface Finish they achieve.',
}

const SPOT_COATING = {
  title: 'Spot Coating',
  slug: 'spot-coating',
  description:
    'Coatings applied to selected areas of the design for contrast — spot UV, spot gloss, spot glitter, raised and textured spot UV.',
}

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET || 'development'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --apply needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  // Explicit, because the default flipped: on apiVersion >= 2025-02-19 the client
  // defaults to `published`, which silently drops every draft from query results —
  // and this repo's .env.local carries 2025-09-25. The draft handling below depends
  // on seeing them.
  perspective: 'raw',
})

async function main() {
  console.log(`\n🔧  Split the Coating Customization Type (PROD-2250, D47 / ADR-017)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${apply ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}\n`)

  const coating = await client.fetch(`*[_id == $id][0]{ _id, title, "slug": slug.current, order, "categoryRef": category._ref }`, { id: COATING_ID })
  if (!coating) {
    console.error(`❌  ${COATING_ID} not found in ${DATASET}. Nothing to split — check the dataset.`)
    process.exit(1)
  }
  const spotExisting = await client.fetch(`*[_id == $id][0]{ _id, title }`, { id: SPOT_ID })
  const movers = await client.fetch(
    `*[_type == "customizationOption" && slug.current in $slugs]{
       _id, title, "slug": slug.current, "typeRef": type._ref, "isDraft": _id in path("drafts.**") }`,
    { slugs: SPOT_OPTION_SLUGS },
  )
  const stayers = await client.fetch(
    `*[_type == "customizationOption" && type._ref == $id && !(slug.current in $slugs)
       && !(_id in path("drafts.**"))]{
       title, "slug": slug.current, role } | order(title asc)`,
    { id: COATING_ID, slugs: SPOT_OPTION_SLUGS },
  )

  const steps = []

  // 1 — rename in place
  if (coating.title === SURFACE_COATING.title && coating.slug === SURFACE_COATING.slug) {
    console.log(`✅  1. ${COATING_ID} is already "${SURFACE_COATING.title}" [${SURFACE_COATING.slug}] — no rename needed.`)
  } else {
    console.log(`${apply ? '✏️ ' : '•'}  1. RENAME  ${COATING_ID}`)
    console.log(`         title  "${coating.title}" → "${SURFACE_COATING.title}"`)
    console.log(`         slug   "${coating.slug}" → "${SURFACE_COATING.slug}"`)
    steps.push((tx) =>
      tx.patch(COATING_ID, (p) =>
        p.set({
          title: SURFACE_COATING.title,
          slug: { _type: 'slug', current: SURFACE_COATING.slug },
          description: SURFACE_COATING.description,
        }),
      ),
    )
  }

  // 2 — create the sibling
  if (spotExisting) {
    console.log(`✅  2. ${SPOT_ID} already exists ("${spotExisting.title}") — no create needed.`)
  } else {
    console.log(`${apply ? '✏️ ' : '•'}  2. CREATE  ${SPOT_ID} — "${SPOT_COATING.title}" [${SPOT_COATING.slug}], category=Finishes, order=${coating.order ?? 2}`)
    steps.push((tx) =>
      // createIfNotExists, not create: a partially-applied earlier run must not throw.
      tx.createIfNotExists({
        _id: SPOT_ID,
        _type: 'customizationType',
        title: SPOT_COATING.title,
        slug: { _type: 'slug', current: SPOT_COATING.slug },
        category: { _type: 'reference', _ref: coating.categoryRef ?? FINISHES_CATEGORY_ID },
        description: SPOT_COATING.description,
        order: coating.order ?? 2,
      }),
    )
  }

  // 3 — repoint the movers (published and draft alike)
  const toRepoint = movers.filter((m) => m.typeRef !== SPOT_ID)
  if (!movers.length) {
    console.log(`⚠️   3. No Option found for slug(s) ${SPOT_OPTION_SLUGS.join(', ')} — nothing to repoint. Check the dataset.`)
  } else if (!toRepoint.length) {
    console.log(`✅  3. ${movers.length} Option(s) already point at ${SPOT_ID} — no repoint needed.`)
  } else {
    for (const m of toRepoint) {
      console.log(`${apply ? '✏️ ' : '•'}  3. REPOINT ${m.isDraft ? '[draft] ' : ''}${m.title} [${m.slug}] — ${m.typeRef} → ${SPOT_ID}`)
      steps.push((tx) => tx.patch(m._id, (p) => p.set({ type: { _type: 'reference', _ref: SPOT_ID } })))
    }
  }

  console.log(`\n   Staying on ${SURFACE_COATING.title}: ${stayers.map((s) => `${s.title} (${s.role ?? 'no role'})`).join(', ') || '(none)'}`)

  if (!steps.length) {
    console.log(`\n✅  Nothing to do — ${DATASET} already reflects the split.\n`)
    return
  }
  if (!apply) {
    console.log(`\n${steps.length} write(s) pending. DRY-RUN only — re-run with \`-- --apply\`. Verify on DEVELOPMENT, then run PRODUCTION (dev is nightly-synced from prod).\n`)
    return
  }

  const tx = client.transaction()
  for (const step of steps) step(tx)
  await tx.commit()
  console.log(`\n✅  Split applied in ${DATASET} — ${steps.length} write(s).`)
  console.log(`    Follow-up: once every Option under a Type shares one role, drop that Type's slugs from`)
  console.log(`    REFERENCE_SLUGS in backfill-customization-option-role.mjs and classify by Type instead.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
