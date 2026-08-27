/**
 * Backfill `role` on `customizationOption` (PROD-2250, D47 / ADR-017).
 *
 * `role` is `configurable | reference`, required, with `initialValue: 'configurable'`.
 * initialValue only applies to documents CREATED in the Studio after the field ships —
 * existing documents carry no value, so they fail required-validation the moment an
 * editor opens them, and the conditional availability warning has nothing to read.
 * Hence: the backfill lands in the same PR as the field (D47 §3, sequencing).
 *
 * Classification source: Eric's `Capabilities Flow` diagram (2026-08-26), which badges
 * each Customization TYPE. Its badges map onto `role` one-for-one:
 *
 *   "Not Customizable"                     → every Option under that Type is `reference`
 *   (no badge) / "Multiple|Single Selection" → `configurable`
 *   "only for Product Customization" +
 *   "No detail page"                        → `configurable` (the simplified pick)
 *
 * Reference Types in the diagram:
 *   Materials  › Pouch Layer        ("Not on 'Product Customization'") — LLDPE, LDPE,
 *                                    HDPE, VMPET, PET Pouch Film. Not authored yet.
 *   Finishing  › Lamination         — Matte / Gloss / Soft Touch / … Lamination
 *   Finishing  › Surface Coating    — UV, AQ (Aqueous), Varnish, Soft-Touch, … Coating
 *   Finishing  › Cutting            — die cutting, laser cutting, slotting. Not authored.
 *   Finishing  › Gluing             — adhesives. Not authored.
 *
 * Configurable Types that get NO detail page:
 *   Finishing  › Surface Finish (paper-based) and (non-paper) — Matte, Gloss, Semi-Gloss…
 *   Materials  › Pouch Material     — Standard / Clear / High-Barrier / Kraft Laminate
 *   Finishing  › Food-safe Treatment › Food-Grade Material
 *
 * ⚠️  The diagram splits Coating into two Types — `Spot Coating` (customizable:
 * Spot UV/Spot Gloss, Spot Glitter, Raised/Textured Spot UV) and `Surface Coating`
 * (not customizable: UV, AQ, Varnish…). Sanity currently has ONE `Coating` Type
 * holding both, which is why the slugs below are enumerated per-Option rather than
 * derived from the Type. Splitting the Type is separate work.
 *
 * Idempotent: the default run only writes where `role` is MISSING — it never overwrites
 * an editor's value. Options that already carry a role but contradict the diagram are
 * listed at the end of a run instead.
 *
 * `--reclassify` additionally corrects those. It was approved 2026-08-26 for the six
 * Options the first backfill mis-set (Matte / Gloss / Soft Touch Lamination and UV /
 * Aqueous / Varnish Coating), which were written `configurable` before the Capabilities
 * Flow diagram was available. It only ever writes the role the diagram dictates, so
 * re-running it is a no-op once the data agrees.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run backfill:customization-role
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run backfill:customization-role -- --apply
 *   NEXT_PUBLIC_SANITY_DATASET=production  pnpm --filter @pakfactory/studio run backfill:customization-role -- --apply
 *
 * ⚠️  The development dataset is nightly-synced from production, so a dev-only apply
 * is wiped overnight. Run development first to verify, then production to make it stick.
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token cannot --apply.
 *
 * Processes published documents AND drafts. A patched draft still needs a human to
 * publish it in the Studio — this script never publishes.
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
// Correct Options that already carry a role but contradict the diagram. Off by
// default: the plain backfill must stay non-destructive, and flipping a value an
// editor can see is a deliberate act, not a side effect of filling blanks.
const reclassify = process.argv.includes('--reclassify')

/**
 * Slugs to write as `reference` instead of `configurable`, from the Capabilities Flow
 * diagram. Enumerated per-Option because Sanity's single `Coating` Type spans two of
 * Eric's Types (see the header).
 */
const REFERENCE_SLUGS = new Set([
  // Finishing › Lamination — "Not Customizable"
  'matte-lamination',
  'gloss-lamination',
  'soft-touch-lamination',
  // Finishing › Surface Coating — "Not Customizable". NOT `spot-uv`, which the diagram
  // puts under the un-badged `Spot Coating` Type.
  'uv-coating',
  'aqueous-coating',
  'varnish-coating',
])

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
  // and this repo's .env.local carries 2025-09-25. Without it the draft check below
  // reports "no drafts" whether or not any exist. Both queries filter drafts in GROQ
  // themselves, so `raw` is what they were written against.
  perspective: 'raw',
})

async function main() {
  console.log(`\n🔧  Backfill customizationOption.role (PROD-2250, D47 / ADR-017)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${apply ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}${reclassify ? ' +RECLASSIFY (corrects existing roles)' : ''}\n`)

  // Drafts are backfilled too, not just reported: `role` is required, and publishing a
  // draft that lacks it overwrites the published document and unsets the field again.
  const docs = await client.fetch(
    `*[_type == "customizationOption" && !defined(role)]{
       _id, title, "slug": slug.current, "type": type->title, "category": category->title,
       "isDraft": _id in path("drafts.**")
     } | order(category asc, type asc, title asc)`,
  )

  // Already-classified Options whose Type the diagram badges "Not Customizable". The
  // script never overwrites a set value, so these are surfaced rather than patched.
  const mismatched = await client.fetch(
    `*[_type == "customizationOption" && defined(role) && role != "reference"
       && slug.current in $refs && !(_id in path("drafts.**"))]{
       _id, title, role, "slug": slug.current, "type": type->title } | order(type asc, title asc)`,
    { refs: [...REFERENCE_SLUGS] },
  )
  const reportMismatched = () => {
    if (!mismatched.length) return
    if (reclassify) {
      console.log(`\n\u267b\ufe0f  ${mismatched.length} published Option(s) will be RECLASSIFIED to \`reference\` — their Type is badged "Not Customizable" in the Capabilities Flow diagram:`)
      mismatched.forEach((d) => console.log(`${apply ? '   \u270f\ufe0f' : '   \u2022'} ${d.type ?? '\u2014'} \u203a ${d.title} [${d.slug}] \u2014 ${d.role} \u2192 reference`))
    } else {
      console.log(`\n\u26a0\ufe0f  ${mismatched.length} published Option(s) are classified \`configurable\` but sit under a Type the Capabilities Flow diagram badges "Not Customizable". Not changed \u2014 re-run with \`--reclassify\` to correct them:`)
      mismatched.forEach((d) => console.log(`     ${d.type ?? '\u2014'} \u203a ${d.title} [${d.slug}] \u2014 currently ${d.role}`))
    }
    console.log('')
  }

  if (docs.length === 0 && !(reclassify && mismatched.length)) {
    console.log('✅  Nothing to backfill — every Option already has a role.')
    reportMismatched()
    return
  }

  const changes = docs.map((d) => ({
    _id: d._id,
    slug: d.slug,
    label: `${d.isDraft ? '[draft] ' : ''}${d.category ?? '—'} › ${d.type ?? '—'} › ${d.title ?? d._id}`,
    isDraft: d.isDraft,
    role: REFERENCE_SLUGS.has(d.slug) ? 'reference' : 'configurable',
  }))

  for (const c of changes) {
    console.log(`${apply ? '✏️ ' : '•'} ${c.role === 'reference' ? '📗' : '🎛 '} ${c.role.padEnd(12)} ${c.label}`)
  }

  const nRef = changes.filter((c) => c.role === 'reference').length
  const nDraft = changes.filter((c) => c.isDraft).length
  if (changes.length) console.log(`\n${changes.length} doc(s) to backfill — ${changes.length - nRef} configurable, ${nRef} reference (${nDraft} of them drafts)`)

  if (nDraft) {
    console.log(`\n📝  ${nDraft} draft(s) patched below still need a human to review and PUBLISH in the Studio — patching a draft does not publish it.`)
  }

  reportMismatched()

  if (!apply) {
    console.log(`\nDRY-RUN only — re-run with \`-- --apply\` to write. Verify on DEVELOPMENT, then run PRODUCTION (dev is nightly-synced from prod).\n`)
    return
  }

  const tx = client.transaction()
  for (const c of changes) tx.patch(c._id, (p) => p.set({ role: c.role }))
  if (reclassify) {
    // Patch the draft too where one exists, so the correction is not undone the next
    // time somebody publishes.
    const ids = mismatched.flatMap((d) => [d._id, `drafts.${d._id}`])
    const live = await client.fetch(`*[_id in $ids]._id`, { ids })
    for (const _id of live) tx.patch(_id, (p) => p.set({ role: 'reference' }))
  }
  await tx.commit()
  const nReclassified = reclassify ? mismatched.length : 0
  console.log(`\n✅  ${changes.length} Option(s) backfilled${nReclassified ? `, ${nReclassified} reclassified to reference` : ''} in ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
