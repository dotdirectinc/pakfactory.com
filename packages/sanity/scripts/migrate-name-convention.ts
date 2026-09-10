/**
 * PROD-2458 — one concept, one name, part two: `title` / `h1` / `shortName`.
 *
 * PROD-2454/2455 did this for the description pair. This does it for the name
 * fields, which had the same problem in a worse form: four keys doing naming
 * work — `title`, `displayTitle`, `headline`, `hero.headline` — and no editor
 * could tell which one rendered where.
 *
 * The convention, on every type with a public page:
 *
 *   title      canonical, required, always presentable
 *   h1         the page heading      — empty falls back to title
 *   shortName  the card / nav label  — empty falls back to title
 *
 * Only two of the old fields hold anything, and this copies both onto `h1`:
 *
 *   product.headline  → product.h1   (246 docs)
 *   solution.headline → solution.h1  (36 docs)
 *
 * Everything else in the schema change was free. `displayTitle` was declared on
 * six types and populated on NONE of them, with no reader anywhere in `apps/www`
 * or `apps/blog`, so it was deleted outright rather than deprecated — there was
 * no data to strand and no consumer to migrate. Same for `productStyle`'s
 * `hero.headline`, which was the H1 all along and is now the top-level `h1`.
 *
 * COPY ONLY — `headline` stays in place on both types, marked `deprecated` in
 * the schema so the Studio renders it read-only with a visible reason (§4.3:
 * never remove a populated field in the change that stops using it). PROD-2459
 * unsets it.
 *
 * NO KEY IS REUSED, which is what makes this simpler than PROD-2455. `h1` is a
 * new key holding the same type (string) as the field it copies from, so there
 * is no schema-before-data ordering hazard — deploy and migrate in either order.
 *
 * `contentWidget.headline` and `page.headline`/`page.subheadline` are DIFFERENT
 * fields on different types and are deliberately untouched. The widget one
 * renders in live blog CTAs; the `page` ones are on a legacy type with its own
 * cleanup pending.
 *
 * Additive-safe and idempotent: only patches documents that have the old field
 * and not the new one, so re-running is a no-op.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:name-convention --dataset development
 *   ... --confirm                                        # apply (dry-run is default)
 *   ... --dataset production --confirm --yes-production
 *   ... --dataset production --verify                    # read-only
 *
 * Env: SANITY_API_WRITE_TOKEN. Project id from NEXT_PUBLIC_SANITY_PROJECT_ID /
 * SANITY_STUDIO_PROJECT_ID.
 */

import { createClient, type SanityClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(__dirname, '../../../.env.local') })
loadEnv({ path: join(__dirname, '../../../.env') })

const args = process.argv.slice(2)
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`)
  return i === -1 ? undefined : args[i + 1]
}
const has = (n: string) => args.includes(`--${n}`)

const dataset = flag('dataset')
const confirm = has('confirm')
const verifyOnly = has('verify')
const yesProduction = has('yes-production')

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || ''
const token = process.env.SANITY_API_WRITE_TOKEN || ''
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01'

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
if (!dataset) fail('--dataset is required.')
if (!projectId) fail('No project id in env.')
if (!token) fail('No SANITY_API_WRITE_TOKEN in env.')
if (dataset === 'production' && confirm && !yesProduction)
  fail('Refusing to write to production without --yes-production.')

const client: SanityClient = createClient({ projectId, dataset: dataset!, apiVersion, token, useCdn: false })
const write = confirm && !verifyOnly

/** Expected populated counts on PRODUCTION, verified 2026-09-10. Dev has its own. */
type Move = { type: string; from: string; to: string; expected: number }

const MOVES: Move[] = [
  { type: 'product', from: 'headline', to: 'h1', expected: 246 },
  { type: 'solution', from: 'headline', to: 'h1', expected: 36 },
]

type Doc = { _id: string; value: unknown }

/** Drafts and published both — perspective raw returns drafts.* alongside published. */
const pending = (m: Move) =>
  `*[_type == "${m.type}" && defined(${m.from}) && !defined(${m.to})]{ _id, "value": ${m.from} }`

function preview(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value.slice(0, 60))
  return String(value)
}

async function report() {
  console.log('\nPopulated counts (raw — drafts included):\n')
  console.log('  type / field                                old      new')
  for (const m of MOVES) {
    const [oldCount, newCount] = await Promise.all([
      client.fetch<number>(`count(*[_type == "${m.type}" && defined(${m.from})])`, {}, { perspective: 'raw' }),
      client.fetch<number>(`count(*[_type == "${m.type}" && defined(${m.to})])`, {}, { perspective: 'raw' }),
    ])
    const label = `${m.type}.${m.from} → ${m.to}`.padEnd(44)
    console.log(`  ${label}${String(oldCount).padStart(5)}${String(newCount).padStart(9)}`)
  }
  console.log(
    '\n  The old columns stay populated on purpose — the field is deprecated,\n' +
      '  not removed. The follow-up ticket unsets it.\n',
  )
}

/**
 * Every copied value must match its source exactly. A string copy cannot really
 * go wrong, but the last two tickets both ended with a closing report that read
 * stale counts (transactions commit with `visibility: 'async'`), so confirming
 * the values rather than the counts is the check worth having.
 */
async function verifyValuesMatch() {
  let bad = 0
  for (const m of MOVES) {
    const mismatched = await client.fetch<{ _id: string }[]>(
      `*[_type == "${m.type}" && defined(${m.from}) && ${m.to} != ${m.from}]{ _id }`,
      {},
      { perspective: 'raw' },
    )
    if (mismatched.length === 0) {
      console.log(`  ${m.type}: every ${m.from} matches ${m.to} ✓`)
      continue
    }
    bad += mismatched.length
    console.error(`  ${m.type}: ${mismatched.length} doc(s) where ${m.to} != ${m.from}:`)
    for (const d of mismatched.slice(0, 10)) console.error(`      ${d._id}`)
    if (mismatched.length > 10) console.error(`      … and ${mismatched.length - 10} more`)
  }
  if (bad) console.error('\n⚠️ Investigate before running the cleanup — it gates on `h1` being present, not correct.')
}

async function main() {
  console.log(
    `Name convention (title / h1 / shortName) — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )

  if (verifyOnly) {
    await report()
    console.log('Value check:')
    await verifyValuesMatch()
    return
  }

  let total = 0
  for (const m of MOVES) {
    const docs = await client.fetch<Doc[]>(pending(m), {}, { perspective: 'raw' })
    // `expected` is a production figure, so only production can meaningfully
    // drift from it. `development` is a separate dataset that has diverged —
    // flagging that as drift would be crying wolf on every dev run.
    const drifted = dataset === 'production' && docs.length !== m.expected
    console.log(
      `\n${m.type}.${m.from} → ${m.to}: ${docs.length} doc(s) to copy` +
        (drifted ? `  ⚠️ expected ${m.expected} — counts have drifted, check before applying` : ''),
    )
    if (docs.length === 0) continue
    total += docs.length

    if (!write) {
      for (const d of docs.slice(0, 5)) console.log(`  would set ${m.to} = ${preview(d.value)} on ${d._id}`)
      if (docs.length > 5) console.log(`  … and ${docs.length - 5} more`)
      continue
    }

    for (let i = 0; i < docs.length; i += 50) {
      const tx = client.transaction()
      for (const d of docs.slice(i, i + 50)) {
        tx.patch(client.patch(d._id).setIfMissing({ [m.to]: d.value }))
      }
      await tx.commit({ visibility: 'async' })
      console.log(`  copied ${Math.min(i + 50, docs.length)}/${docs.length}`)
    }
  }

  if (!write) {
    console.log(`\n${total} document(s) would be patched.\nDRY-RUN — re-run with --confirm to apply.`)
    return
  }
  console.log(`\n✓ Done — ${total} document(s) patched.`)
  await report()
  console.log('Value check:')
  await verifyValuesMatch()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
