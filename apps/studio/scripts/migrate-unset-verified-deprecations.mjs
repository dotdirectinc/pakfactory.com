/**
 * Unset the seven deprecated keys whose fields come out of the schema in the
 * same PR (PROD-2538).
 *
 * This is step 5 of Conventions §4.3 — add, copy, migrate readers, verify,
 * remove. Step 5 had never run. Fields accumulated at step 4, marked deprecated
 * and still deployed, which reads as done and is not.
 *
 * ⚠️ Removing a field from the schema does NOT remove it from stored documents.
 * That is exactly how `showThicknessTable` and its siblings survived on 33
 * Options long after the schema forgot them (D48 §3). Hence this script, in the
 * same deploy.
 *
 * ── What comes out, and why each is safe ──────────────────────────────────
 *
 * FREE — 0 documents on production, no readers anywhere:
 *   customizationOption.exceptProducts
 *   customizationOption.worksOnCustomizations
 *   customizationOption.incompatibleWithCustomizations
 *
 * SUCCESSOR VERIFIED — the condition each field's own comment named is met, and
 * this script re-checks it rather than trusting the measurement:
 *   customizationOption.role        126 → configuratorRole 126 + hasPage 126
 *   customizationType.cardinality    37 → customerSelects 37
 *   product.primarySolution          58 → solutions[0], 0 mismatches
 *
 * A DELIBERATE LOSS, agreed by Eric 2026-09-17:
 *   customizationOption.availableOnProducts — 2 documents.
 *
 * 🔴 Those two name product LINES, and the product side enumerates option by
 * option, so they cannot be carried across. Re-stating them means listing every
 * folding carton and every rigid box individually — the mass population blocked
 * on the spec-system brief. The three facts are recorded in the decision
 * register instead. THIS SCRIPT PRINTS THEM BEFORE UNSETTING, so the loss lands
 * in the run log rather than happening quietly. There is no override flag: the
 * printed list is the record.
 *
 * ── The gates ─────────────────────────────────────────────────────────────
 *
 * D51: "the destructive script must refuse to run unless every value has
 * already been copied". Re-checked PER DATASET, because "it was safe on
 * production" is not a fact about development — and development's nightly sync
 * from production is currently disabled, so it will not heal itself either.
 *
 * No override flag on the gates. A gate you can skip is a comment.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   pnpm --filter @pakfactory/studio run migrate:unset-verified-deprecations -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:unset-verified-deprecations -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:unset-verified-deprecations -- --dataset production --confirm --yes-production
 *
 * ⚠️ TAKE A DATASET EXPORT FIRST. Sanity has no undo.
 * ⚠️ Run in the SAME deploy as the schema change, and run BOTH datasets.
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
  pnpm --filter @pakfactory/studio run migrate:unset-verified-deprecations -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

/** Type → keys to unset. */
const REMOVED = {
  customizationOption: [
    'role',
    'availableOnProducts',
    'exceptProducts',
    'worksOnCustomizations',
    'incompatibleWithCustomizations',
  ],
  customizationType: ['cardinality'],
  product: ['primarySolution'],
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
  // Explicit: on apiVersion >= 2025-02-19 the client defaults to `published`,
  // which silently drops every draft. A draft holding an unswept key would be
  // republished later and put it straight back.
  perspective: 'raw',
})

const label = (d) => `${d.isDraft ? '[draft] ' : ''}${d.title ?? d._id}`

/**
 * Two outcomes, and telling them apart is the whole job.
 *
 * 🔴 MISSING — the old key is set and the successor is not. The copy never
 * happened, so unsetting would destroy the only value. Aborts the entire run,
 * not just that type: a half-swept dataset is harder to reason about than an
 * unswept one.
 *
 * ⚠️ DIVERGED — both are set and they disagree. This is NOT a lost copy, and
 * treating it as one is what a first pass got wrong. Every field this script
 * removes is `readOnly` in the Studio, so no editor can have changed the OLD
 * value; a disagreement can only mean the successor was edited after the copy,
 * which makes the old value stale by construction. It is listed rather than
 * fatal — but it is always listed, because a stale value being dropped belongs
 * in the run log.
 *
 * Found by running against `development`, where `Ink` had been switched to
 * `many` during testing while its deprecated `cardinality` still read `one`.
 * A gate that cannot be run is not a gate.
 */
async function runGates() {
  const missing = []
  const diverged = []

  const roleRows = await client.fetch(
    `*[_type == "customizationOption" && defined(role) &&
       (!defined(configuratorRole) || role != configuratorRole)]{
         _id, title, role, configuratorRole, "isDraft": _id in path("drafts.**") }`,
  )
  const describeRole = (d) =>
    `${label(d)} — role="${d.role}" configuratorRole="${d.configuratorRole ?? '(unset)'}"`
  const roleMissing = roleRows.filter((d) => !d.configuratorRole)
  if (roleMissing.length) {
    missing.push({
      gate: 'customizationOption.role → configuratorRole',
      why: 'the split never ran on these, so unsetting would destroy the only copy',
      fix: 'run `migrate:split-customization-role` on this dataset first',
      docs: roleMissing.map(describeRole),
    })
  }
  const roleDiverged = roleRows.filter((d) => d.configuratorRole)
  if (roleDiverged.length) {
    diverged.push({ gate: 'customizationOption.role', docs: roleDiverged.map(describeRole) })
  }

  const cardRows = await client.fetch(
    `*[_type == "customizationType" && defined(cardinality) &&
       (!defined(customerSelects) || cardinality != customerSelects)]{
         _id, title, cardinality, customerSelects, "isDraft": _id in path("drafts.**") }`,
  )
  const describeCard = (d) =>
    `${label(d)} — cardinality="${d.cardinality}" customerSelects="${d.customerSelects ?? '(unset)'}"`
  const cardMissing = cardRows.filter((d) => !d.customerSelects)
  if (cardMissing.length) {
    missing.push({
      gate: 'customizationType.cardinality → customerSelects',
      why: 'the rename never ran on these',
      fix: 'copy `cardinality` to `customerSelects` on this dataset first',
      docs: cardMissing.map(describeCard),
    })
  }
  const cardDiverged = cardRows.filter((d) => d.customerSelects)
  if (cardDiverged.length) {
    diverged.push({ gate: 'customizationType.cardinality', docs: cardDiverged.map(describeCard) })
  }

  const primaryRows = await client.fetch(
    `*[_type == "product" && defined(primarySolution) &&
       primarySolution._ref != solutions[0]._ref]{
         _id, title, "primary": primarySolution->title, "first": solutions[0]->title,
         "hasSolutions": count(solutions) > 0, "isDraft": _id in path("drafts.**") }`,
  )
  const describePrimary = (d) =>
    `${label(d)} — primarySolution="${d.primary}" solutions[0]="${d.first ?? '(none)'}"`
  const primaryMissing = primaryRows.filter((d) => !d.hasSolutions)
  if (primaryMissing.length) {
    missing.push({
      gate: 'product.primarySolution → solutions[0]',
      why: '`solutions` is empty on these, so the primary exists nowhere else',
      fix: 'add the solution to `solutions` on this dataset first',
      docs: primaryMissing.map(describePrimary),
    })
  }
  const primaryDiverged = primaryRows.filter((d) => d.hasSolutions)
  if (primaryDiverged.length) {
    diverged.push({ gate: 'product.primarySolution', docs: primaryDiverged.map(describePrimary) })
  }

  return { missing, diverged }
}

/**
 * `availableOnProducts` has no successor to check against, so there is no gate
 * to pass — only a record to leave. Printed on every run, dry or not.
 */
async function reportDeliberateLoss() {
  const docs = await client.fetch(
    `*[_type == "customizationOption" && count(availableOnProducts) > 0]{
       _id, title, "isDraft": _id in path("drafts.**"),
       "points_at": availableOnProducts[]->title } | order(title asc)`,
  )
  if (!docs.length) return
  console.log(
    `\n🔴  ${docs.length} document(s) carry \`availableOnProducts\`, and this is a DELIBERATE LOSS —`,
  )
  console.log(
    `    they name product lines, which the product side cannot express. Recorded in the decision`,
  )
  console.log(`    register rather than migrated. What is being deleted:\n`)
  docs.forEach((d) => console.log(`     ${label(d)} → ${(d.points_at ?? []).join(' · ') || '(unresolvable refs)'}`))
  console.log('')
}

async function main() {
  console.log(`\n🧹  Unset verified deprecations (PROD-2538)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const { missing, diverged } = await runGates()

  if (missing.length) {
    console.error(`❌  ABORTED — ${missing.length} successor(s) missing. Nothing was written.\n`)
    for (const f of missing) {
      console.error(`   ${f.gate}`)
      console.error(`     ${f.docs.length} document(s): ${f.why}`)
      f.docs.slice(0, 10).forEach((d) => console.error(`       ${d}`))
      if (f.docs.length > 10) console.error(`       …and ${f.docs.length - 10} more`)
      console.error(`     → ${f.fix}\n`)
    }
    process.exit(1)
  }
  console.log('✅  Every successor is present — nothing would lose its only copy.\n')

  if (diverged.length) {
    const n = diverged.reduce((sum, d) => sum + d.docs.length, 0)
    console.log(
      `⚠️  ${n} document(s) hold an old value that disagrees with its successor. The old field is`,
    )
    console.log(
      `    read-only, so the successor was edited after the copy and the old value is stale.`,
    )
    console.log(`    Dropping it is correct — listed so the run log says what went:\n`)
    for (const d of diverged) {
      console.log(`   ${d.gate}`)
      d.docs.slice(0, 10).forEach((x) => console.log(`     ${x}`))
      if (d.docs.length > 10) console.log(`     …and ${d.docs.length - 10} more`)
    }
    console.log('')
  }

  await reportDeliberateLoss()

  const tx = client.transaction()
  let writes = 0

  for (const [type, fields] of Object.entries(REMOVED)) {
    // Which keys each document actually holds is worked out here rather than in
    // GROQ: a conditional inside a projected array is not valid there, and the
    // run log is only useful if it names the keys per document.
    const docs = await client.fetch(
      `*[_type == $t && (${fields.map((f) => `defined(${f})`).join(' || ')})]{
         _id, title, "isDraft": _id in path("drafts.**"),
         ${fields.map((f) => `"has_${f}": defined(${f})`).join(', ')}
       } | order(title asc)`,
      { t: type },
    )
    if (!docs.length) {
      console.log(`•  ${type}: nothing to unset`)
      continue
    }
    console.log(`\n${apply ? '✏️ ' : '•'}  ${type}: ${docs.length} document(s)`)
    for (const d of docs) {
      const held = fields.filter((f) => d[`has_${f}`])
      console.log(`     ${label(d)} — ${held.join(', ')}`)
      if (apply) {
        tx.patch(d._id, (p) => p.unset(fields))
        writes += 1
      }
    }
  }

  if (!apply) {
    console.log(
      `\nDRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`) to write.`,
    )
    console.log(`⚠️  Take a dataset export first. Sanity has no undo.\n`)
    return
  }

  if (writes === 0) {
    console.log('\n✅  Nothing to unset — every key is already gone from this dataset.\n')
    return
  }

  await tx.commit()
  console.log(`\n✅  ${writes} document(s) patched in ${DATASET}.`)
  console.log(`    Re-query each key to confirm 0, and run the other dataset too.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
