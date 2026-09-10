/**
 * PROD-2455 — remove the description fields deprecated by PROD-2454.
 *
 * PROD-2454 copied every value onto its new key and left the old field in
 * place, marked `deprecated` (Conventions §4.3: never remove a populated field
 * in the change that stops using it). This unsets the old keys.
 *
 *   productLine.cardSummary   (copied to shortDescription)
 *   productLine.intro         (copied to description)
 *   solution.subheadline      (copied to shortDescription)
 *   solution.intro            (copied to description)
 *   productStyle.description  (copied to shortDescription)
 *   product.description       (copied to shortDescription)
 *
 * ⚠️ THIS SCRIPT DESTROYS DATA. Its predecessor only ever added fields; this
 * one removes them, and Sanity has no undo. Take a dataset export first:
 *
 *   pnpm sanity:backup:prod        # needs Node >= 22.12, see note below
 *
 * THE SAFETY GATE. Before unsetting anything it checks, per mapping, that no
 * document holds the old value without the new one. If PROD-2454's copy never
 * ran — or ran against a different dataset, or missed documents added since —
 * unsetting would destroy copy that exists nowhere else. Any such document
 * aborts the whole run, listed by id. There is no flag to skip this.
 *
 * Freeing `description` on Style and Product is what lets the schema reuse
 * that key for the long-form portable-text field. So the order is:
 * unset → confirm zero → THEN deploy the schema. Deploy first and 387
 * documents hold a plain string under a key the Studio now reads as an array.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:description-cleanup --dataset development
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
  { type: 'productLine', old: 'cardSummary', copiedTo: 'shortDescription' },
  { type: 'productLine', old: 'intro', copiedTo: 'description' },
  { type: 'solution', old: 'subheadline', copiedTo: 'shortDescription' },
  { type: 'solution', old: 'intro', copiedTo: 'description' },
  { type: 'productStyle', old: 'description', copiedTo: 'shortDescription' },
  { type: 'product', old: 'description', copiedTo: 'shortDescription' },
]

/**
 * `description` on Line and Solution is portable text. A few legacy documents
 * (2 drafts on development at the time of writing, none on production) hold a
 * plain STRING there from an older schema. Left alone, the Studio reads a
 * string where it expects an array and the field will not render.
 */
const LEGACY_STRING_TYPES = ['productLine', 'solution'] as const

type Doc = { _id: string; _type?: string; value?: unknown }

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

async function findLegacyStrings(): Promise<Doc[]> {
  const out: Doc[] = []
  for (const type of LEGACY_STRING_TYPES) {
    const docs = await client.fetch<Doc[]>(
      `*[_type == "${type}" && defined(description)]{ _id, _type, "value": description }`,
      {},
      { perspective: 'raw' },
    )
    // Decide on the real value, not on a GROQ type predicate — `count()` and
    // `[0]` both return null for a string AND for an empty array.
    out.push(...docs.filter((d) => !Array.isArray(d.value)))
  }
  return out
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
  const legacy = await findLegacyStrings()
  console.log(`\n  Legacy non-array \`description\` values: ${legacy.length}`)
}

async function unsetBatch(ids: string[], keys: string[], label: string) {
  for (let i = 0; i < ids.length; i += 50) {
    const tx = client.transaction()
    for (const id of ids.slice(i, i + 50)) tx.patch(client.patch(id).unset(keys))
    await tx.commit({ visibility: 'async' })
    console.log(`  ${label}: ${Math.min(i + 50, ids.length)}/${ids.length}`)
  }
}

async function main() {
  console.log(
    `PROD-2455 remove deprecated description fields — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )

  if (verifyOnly) {
    await report()
    return
  }

  if (!(await safetyGate())) {
    fail(
      'Aborted. Run `migrate:description-naming` against this dataset first, then re-run.\n' +
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

  const legacy = await findLegacyStrings()
  if (legacy.length > 0) {
    console.log(`\nLegacy non-array \`description\` (pre-PROD-2454 string values): ${legacy.length} doc(s)`)
    for (const d of legacy.slice(0, 5)) console.log(`  ${d._id} — ${JSON.stringify(String(d.value).slice(0, 60))}`)
    if (!write) {
      console.log('  would unset `description` on each (the field is portable text now)')
    } else {
      total += legacy.length
      await unsetBatch(legacy.map((d) => d._id), ['description'], 'legacy')
    }
  }

  if (!write) {
    console.log(`\n${total} document(s) would be changed.\nDRY-RUN — re-run with --confirm to apply.`)
    return
  }
  console.log(`\n✓ Done — ${total} document(s) changed.`)
  await report()
  console.log('\nNext: deploy the schema. Not before — `description` on Style and Product')
  console.log('changes type from text to portable text, and that only works once these')
  console.log('string values are gone.\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
