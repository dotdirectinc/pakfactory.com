/**
 * PROD-2459 — remove the `headline` field deprecated by PROD-2458.
 *
 * PROD-2458 copied every value onto `h1` and left `headline` in place, marked
 * `deprecated` (Conventions §4.3: never remove a populated field in the change
 * that stops using it). This unsets the old key.
 *
 *   product.headline    (copied to h1)
 *   solution.headline   (copied to h1)
 *
 * ⚠️ THIS SCRIPT DESTROYS DATA. Its predecessor only ever added fields; this
 * one removes them, and Sanity has no undo and no trash. Take a dataset export
 * first:
 *
 *   nvm use 22 && pnpm sanity:backup:prod
 *
 * THE SAFETY GATE. Before unsetting anything it checks, per mapping, that no
 * document holds `headline` without an `h1`. If PROD-2458's copy never ran — or
 * ran against a different dataset, or missed documents added since — unsetting
 * would destroy copy that exists nowhere else. Any such document aborts the
 * whole run, listed by id. There is no flag to skip this.
 *
 * NO KEY IS REUSED, which is what makes this simpler than PROD-2455. That
 * ticket had to unset before redeploying, because `description` changed type
 * under a key the new field reclaimed. `headline` is simply retired and `h1` is
 * a separate key, so the unset and the schema removal are independent — either
 * order works, and no document is left holding a value the Studio cannot read.
 *
 * `--verify` compares VALUES, not just counts. Both earlier tickets in this
 * series closed on a stale count, because transactions commit with
 * `visibility: 'async'` and a script's own closing report can read the dataset
 * before it settles. Run it before the unset: a matching count with a differing
 * value is exactly the case the gate cannot see, since the gate only asks
 * whether `h1` is defined, not whether it is correct.
 *
 * `contentWidget.headline` and `page.headline` are DIFFERENT fields on
 * different types and are deliberately untouched — the widget one renders in
 * live blog CTAs.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:name-convention-cleanup --dataset development
 *   ... --confirm                                        # apply (dry-run is default)
 *   ... --dataset production --confirm --yes-production
 *   ... --dataset production --verify                    # read-only
 *
 * Env: SANITY_API_WRITE_TOKEN. Project id from NEXT_PUBLIC_SANITY_PROJECT_ID /
 * SANITY_STUDIO_PROJECT_ID.
 *
 * Note: `scripts/sanity/backup.mjs` shells out to `npx sanity@latest`, which
 * requires Node >= 22.12 while this repo pins 20. Run the backup under `nvm
 * use 22`; the migration itself is fine on 20.
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

/** `old` is removed only where `copiedTo` is populated on the same document. */
type Removal = { type: string; old: string; copiedTo: string }

const REMOVALS: Removal[] = [
  { type: 'product', old: 'headline', copiedTo: 'h1' },
  { type: 'solution', old: 'headline', copiedTo: 'h1' },
]

type Doc = { _id: string }

/** Drafts and published both — perspective raw returns drafts.* alongside published. */
const orphaned = (r: Removal) =>
  `*[_type == "${r.type}" && defined(${r.old}) && !defined(${r.copiedTo})]{ _id }`
const removable = (r: Removal) =>
  `*[_type == "${r.type}" && defined(${r.old}) && defined(${r.copiedTo})]{ _id }`

async function safetyGate(): Promise<boolean> {
  console.log('\nSafety gate — looking for values that were never copied…')
  let blocked = false
  for (const r of REMOVALS) {
    const docs = await client.fetch<Doc[]>(orphaned(r), {}, { perspective: 'raw' })
    if (docs.length === 0) {
      console.log(`  ✓ ${r.type}.${r.old} — every value has a ${r.copiedTo}`)
      continue
    }
    blocked = true
    console.error(
      `  ✖ ${r.type}.${r.old} — ${docs.length} doc(s) have NO ${r.copiedTo}. Unsetting would destroy them:`,
    )
    for (const d of docs.slice(0, 10)) console.error(`      ${d._id}`)
    if (docs.length > 10) console.error(`      … and ${docs.length - 10} more`)
  }
  return !blocked
}

/**
 * The gate asks whether `h1` EXISTS. This asks whether it is RIGHT. A document
 * whose `h1` was written by something other than the migration would pass the
 * gate and still lose its only correct copy, so run this BEFORE unsetting.
 *
 * ⚠️ Afterwards it is vacuous and always green: with `headline` gone, nothing
 * matches `defined(old)` and there is nothing left to compare. A green value
 * check on an already-cleaned dataset proves nothing.
 */
async function verifyValuesMatch() {
  console.log('\nValue check — every old value must still match its copy:')
  for (const r of REMOVALS) {
    const mismatched = await client.fetch<Doc[]>(
      `*[_type == "${r.type}" && defined(${r.old}) && ${r.copiedTo} != ${r.old}]{ _id }`,
      {},
      { perspective: 'raw' },
    )
    if (mismatched.length === 0) {
      console.log(`  ✓ ${r.type}: every ${r.old} matches ${r.copiedTo}`)
      continue
    }
    console.error(`  ✖ ${r.type}: ${mismatched.length} doc(s) where ${r.copiedTo} != ${r.old}:`)
    for (const d of mismatched.slice(0, 10)) console.error(`      ${d._id}`)
    if (mismatched.length > 10) console.error(`      … and ${mismatched.length - 10} more`)
  }
}

async function report() {
  console.log('\nRemaining populated counts (raw — drafts included):\n')
  for (const r of REMOVALS) {
    const [oldCount, newCount] = await Promise.all([
      client.fetch<number>(`count(*[_type == "${r.type}" && defined(${r.old})])`, {}, { perspective: 'raw' }),
      client.fetch<number>(`count(*[_type == "${r.type}" && defined(${r.copiedTo})])`, {}, { perspective: 'raw' }),
    ])
    const mark = oldCount === 0 ? '✓' : '·'
    console.log(`  ${mark} ${`${r.type}.${r.old}`.padEnd(30)} ${String(oldCount).padStart(4)}   (${r.copiedTo}: ${newCount})`)
  }
  console.log(
    '\n  The second column must not move. `h1` is what the pages read now;\n' +
      '  the unset targets the old key only.\n',
  )
}

/**
 * `visibility: 'sync'`, deliberately, where the rest of this series used
 * 'async'. With 'async' the commit returns before the dataset settles, so the
 * closing report reads stale and prints a number that is simply wrong — the
 * development run reported 36 remaining `solution.headline` immediately after
 * unsetting all 36 of them, and a re-query showed 0. Three tickets in a row
 * have now been misread that way. 282 documents in six batches is nowhere near
 * the volume that would justify a closing report nobody can trust.
 */
async function unsetBatch(ids: string[], keys: string[], label: string) {
  for (let i = 0; i < ids.length; i += 50) {
    const tx = client.transaction()
    for (const id of ids.slice(i, i + 50)) tx.patch(client.patch(id).unset(keys))
    await tx.commit({ visibility: 'sync' })
    console.log(`  ${label}: ${Math.min(i + 50, ids.length)}/${ids.length}`)
  }
}

async function main() {
  console.log(
    `PROD-2459 remove deprecated headline — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )

  if (verifyOnly) {
    await report()
    await verifyValuesMatch()
    return
  }

  if (!(await safetyGate())) {
    fail(
      'Aborted. Run `migrate:name-convention` against this dataset first, then re-run.\n' +
        '  Nothing has been changed.',
    )
  }

  let total = 0
  for (const r of REMOVALS) {
    const docs = await client.fetch<Doc[]>(removable(r), {}, { perspective: 'raw' })
    console.log(`\n${r.type}.${r.old}: ${docs.length} doc(s) to unset`)
    if (docs.length === 0) continue
    total += docs.length
    if (!write) {
      for (const d of docs.slice(0, 3)) console.log(`  would unset ${r.old} on ${d._id}`)
      if (docs.length > 3) console.log(`  … and ${docs.length - 3} more`)
      continue
    }
    await unsetBatch(docs.map((d) => d._id), [r.old], r.old)
  }

  if (!write) {
    console.log(`\n${total} document(s) would be changed.\nDRY-RUN — re-run with --confirm to apply.`)
    return
  }
  console.log(`\n✓ Done — ${total} document(s) changed.`)
  await report()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
