/**
 * Backfill `availabilityDecidedBy` on `customizationType` (PROD-2532, D61).
 *
 * The field answers "who decides whether a product offers these options?" — `product`
 * or `customization`. It is required and carries NO `initialValue`, deliberately: no
 * default is safe in both directions, because a Type wrongly left on `customization`
 * is INVISIBLE — its options silently never reach any product's picker, which is the
 * exact bug the field exists to remove. Required with no default makes a human choose.
 *
 * That means every existing Type fails required-validation the moment an editor opens
 * it, and the picker shows nothing until they are set. Hence: this lands in the same
 * PR as the field, the way `backfill:customization-role` did for D47 §3.
 *
 * ── The classification, and where it comes from ──────────────────────────────────
 *
 * By CATEGORY, because that is how the answer actually falls:
 *
 *   materials                 → product      a box is made OF these; the product decides
 *   additional-customization  → product      handles, windows, closures — structural
 *   finishing                 → customization  a finish goes ON a material, so the
 *                                             material decides (D8b-dir)
 *   printing                  → customization  same reasoning
 *
 * ── with one exception, and the exception is the whole reason this is a field ─────
 *
 *   finishing › food-safe-treatment → product
 *
 * Food safety is a property of what the box HOLDS, not of the board it is printed on,
 * so the product decides it. That single row is why the answer could not live on the
 * Customization Category: Finishing is a MIXED category, and a category-level flag
 * could only express it by splitting Finishing in two — making the taxonomy serve the
 * configurator instead of describing what things are, which D47 §2 rejected one level
 * down when it moved `role` off the Type and onto the Option.
 *
 * Verified against `production` on 2026-09-17: 36 published Types, no drafts, and the
 * four category slugs are identical in `production` and `development`.
 *
 * ⚠️  A Type whose category slug is none of the four is NOT guessed at. It is listed
 * and skipped, so a new category arrives as a visible question rather than a silent
 * default — which is the failure this whole ticket removes.
 *
 * Idempotent: only writes where `availabilityDecidedBy` is MISSING. It never overwrites
 * an editor's answer; Types that already carry one that contradicts the table above are
 * listed at the end of a run instead of being changed.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   pnpm --filter @pakfactory/studio run backfill:availability-decided-by -- --dataset development
 *   pnpm --filter @pakfactory/studio run backfill:availability-decided-by -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run backfill:availability-decided-by -- --dataset production --confirm --yes-production
 *
 * ⚠️  The development dataset is nightly-synced from production, so a dev-only apply is
 * wiped overnight. Run development first to verify, then production to make it stick.
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token cannot --confirm.
 *
 * Processes published documents AND drafts. A patched draft still needs a human to
 * publish it in the Studio — this script never publishes.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run backfill:availability-decided-by -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

/** Category slug → the answer for every Type inside it, unless overridden below. */
const BY_CATEGORY = {
  materials: 'product',
  'additional-customization': 'product',
  finishing: 'customization',
  printing: 'customization',
}

/**
 * Type slugs that do not take their category's answer. One entry, and it is the
 * reason this field is on the Type rather than the Category — see the header.
 */
const BY_TYPE = {
  'food-safe-treatment': 'product',
}

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset

const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error(
    '❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.',
  )
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  // Explicit: on apiVersion >= 2025-02-19 the client defaults to `published`, which
  // silently drops every draft from query results. The queries below filter drafts in
  // GROQ themselves, so `raw` is what they were written against.
  perspective: 'raw',
})

/** The answer for one Type, or null when nothing in the table covers it. */
function classify(doc) {
  if (doc.typeSlug && Object.hasOwn(BY_TYPE, doc.typeSlug)) return BY_TYPE[doc.typeSlug]
  if (doc.categorySlug && Object.hasOwn(BY_CATEGORY, doc.categorySlug)) {
    return BY_CATEGORY[doc.categorySlug]
  }
  return null
}

async function main() {
  console.log(`\n🔧  Backfill customizationType.availabilityDecidedBy (PROD-2532, D61)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  // Drafts are backfilled too, not just reported: the field is required, and publishing
  // a draft that lacks it overwrites the published document and unsets the field again.
  const docs = await client.fetch(
    `*[_type == "customizationType" && !defined(availabilityDecidedBy)]{
       _id, title,
       "typeSlug": slug.current,
       "categoryTitle": category->title,
       "categorySlug": category->slug.current,
       "optionCount": count(*[_type == "customizationOption" && type._ref == ^._id]),
       "isDraft": _id in path("drafts.**")
     } | order(categoryTitle asc, title asc)`,
  )

  // Already-answered Types whose answer contradicts the table. Surfaced, never patched —
  // an editor's deliberate answer outranks this script's rule.
  const conflicting = []
  const answered = await client.fetch(
    `*[_type == "customizationType" && defined(availabilityDecidedBy)]{
       _id, title, availabilityDecidedBy,
       "typeSlug": slug.current,
       "categoryTitle": category->title,
       "categorySlug": category->slug.current
     } | order(categoryTitle asc, title asc)`,
  )
  for (const d of answered) {
    const expected = classify(d)
    if (expected && expected !== d.availabilityDecidedBy) conflicting.push({ ...d, expected })
  }

  const reportConflicts = () => {
    if (!conflicting.length) return
    console.log(
      `\n⚠️  ${conflicting.length} Type(s) already carry an answer that differs from the table above. NOT changed — a deliberate answer outranks this script. Check each one:`,
    )
    conflicting.forEach((d) =>
      console.log(
        `     ${d.categoryTitle ?? '—'} › ${d.title} — is "${d.availabilityDecidedBy}", table says "${d.expected}"`,
      ),
    )
    console.log('')
  }

  const unmapped = docs.filter((d) => classify(d) === null)
  const changes = docs
    .filter((d) => classify(d) !== null)
    .map((d) => ({
      _id: d._id,
      value: classify(d),
      isDraft: d.isDraft,
      optionCount: d.optionCount,
      label: `${d.isDraft ? '[draft] ' : ''}${d.categoryTitle ?? '—'} › ${d.title ?? d._id}`,
    }))

  if (changes.length === 0) {
    console.log('✅  Nothing to backfill — every Customization Type already has an answer.')
    reportConflicts()
    if (unmapped.length) reportUnmapped(unmapped)
    return
  }

  for (const c of changes) {
    const icon = c.value === 'product' ? '📦' : '🎨'
    const empty = c.optionCount === 0 ? '  (holds no options — invisible in the picker either way)' : ''
    console.log(`${apply ? '✏️ ' : '•'} ${icon} ${c.value.padEnd(13)} ${c.label}${empty}`)
  }

  const nProduct = changes.filter((c) => c.value === 'product').length
  const nDraft = changes.filter((c) => c.isDraft).length
  console.log(
    `\n${changes.length} Type(s) to backfill — ${nProduct} product, ${changes.length - nProduct} customization (${nDraft} of them drafts)`,
  )

  if (nDraft) {
    console.log(
      `\n📝  ${nDraft} draft(s) patched below still need a human to review and PUBLISH in the Studio — patching a draft does not publish it.`,
    )
  }

  if (unmapped.length) reportUnmapped(unmapped)
  reportConflicts()

  if (!apply) {
    console.log(
      `\nDRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`) to write. Verify on DEVELOPMENT, then run PRODUCTION (dev is nightly-synced from prod).\n`,
    )
    return
  }

  const tx = client.transaction()
  for (const c of changes) tx.patch(c._id, (p) => p.set({ availabilityDecidedBy: c.value }))
  await tx.commit()
  console.log(`\n✅  ${changes.length} Customization Type(s) backfilled in ${DATASET}.\n`)
}

/**
 * A Type under a category the table does not name. Never guessed at: the whole point of
 * the field is that a missing answer must be visible, so guessing one here would rebuild
 * the bug in the migration that the schema change removes.
 */
function reportUnmapped(unmapped) {
  console.log(
    `\n🔴  ${unmapped.length} Type(s) sit under a category this script has no rule for. NOT written — answer them by hand in the Studio, and add the category to BY_CATEGORY if it is permanent:`,
  )
  unmapped.forEach((d) =>
    console.log(`     ${d.categoryTitle ?? '(no category)'} › ${d.title} [${d.typeSlug ?? 'no slug'}]`),
  )
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
