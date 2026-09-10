/**
 * Delete the four leftover Solutions from the old `useCase` migration.
 *
 * When the `useCase` taxonomy was folded into Solution, four documents were
 * hand-created with `sol-*` ids. Three of them duplicate a term that later
 * arrived on the Notion "Solutions LP" list under a better name:
 *
 *   sol-gift-packaging          Gift Packaging          → Gifting
 *   sol-retail-shelf-packaging  Retail Shelf Packaging  → Retail
 *   sol-ecommerce-shipping      E-commerce Shipping     → E-commerce
 *   sol-product-launch          Product Launch          → (no counterpart)
 *
 * Product Launch is not a duplicate — it is a use case that did not make the
 * list. Eric's call (2026-09-10) is to delete it with the other three; it is
 * unreferenced and unauthored, so nothing is lost that re-creating the term
 * would not restore.
 *
 * The three duplicates are kept in their better-named form: Gifting, Retail and
 * E-commerce all stay, and all three are on the 31-page list.
 *
 * ⚠️ THIS DELETES DOCUMENTS. There is no undo and no trash — a Sanity delete is
 * final. Take an export first:
 *
 *   nvm use 22 && node scripts/sanity/backup.mjs production
 *
 * (Node 22 because that script shells out to `npx sanity@latest`, which no
 * longer runs on the repo's pinned Node 20.)
 *
 * THREE GATES, checked on every document before anything is deleted. Any
 * failure aborts the entire run — there is no partial delete and no override:
 *
 *   1. The title must match what is expected for that id. Ids are hand-written
 *      here, and a hand-written id is exactly the kind that gets reused for
 *      something else. Deleting the wrong document is unrecoverable.
 *   2. Zero inbound references, counted across drafts and published. Sanity
 *      blocks a delete that would break a strong reference anyway, but failing
 *      loudly beforehand beats a half-applied run.
 *   3. No authored content. If someone has written a headline, copy or a hero
 *      image onto one of these since this was written, it is not the mock
 *      document this script was aimed at.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:solution-cleanup --dataset development
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

/** id → the title it must still have. Both must match, or the run aborts. */
const TARGETS: Record<string, string> = {
  'sol-ecommerce-shipping': 'E-commerce Shipping',
  'sol-gift-packaging': 'Gift Packaging',
  'sol-product-launch': 'Product Launch',
  'sol-retail-shelf-packaging': 'Retail Shelf Packaging',
}

const AUTHORED_FIELDS = ['shortDescription', 'description', 'headline', 'heroImage', 'sections'] as const

type Row = {
  _id: string
  _type: string
  title?: string
  refs: number
  has: Record<(typeof AUTHORED_FIELDS)[number], boolean>
}
type Doc = Omit<Row, 'has'> & { authored: string[] }

async function inspect(): Promise<Doc[]> {
  const ids = Object.keys(TARGETS)
  // Drafts too — `drafts.<id>` is a separate document and must go with its twin.
  const rows = await client.fetch<Row[]>(
    `*[_type == "solution" && (_id in $ids || _id in $draftIds)]{
       _id, _type, title,
       "refs": count(*[references(^._id)]),
       "has": { ${AUTHORED_FIELDS.map((f) => `"${f}": defined(${f})`).join(', ')} }
     }`,
    { ids, draftIds: ids.map((i) => `drafts.${i}`) },
    { perspective: 'raw' },
  )
  // Which fields are populated is decided here rather than in GROQ — a
  // conditional array literal is not valid GROQ, and this reads better anyway.
  return rows.map(({ has, ...rest }) => ({
    ...rest,
    authored: AUTHORED_FIELDS.filter((f) => has?.[f]),
  }))
}

const baseId = (id: string) => id.replace(/^drafts\./, '')

async function main() {
  console.log(
    `Remove useCase leftover Solutions — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )

  const docs = await inspect()
  if (docs.length === 0) {
    console.log('\n✓ Nothing to do — none of the four documents exists here.')
    return
  }

  console.log(`\nFound ${docs.length} document(s):\n`)
  const problems: string[] = []
  for (const d of docs) {
    const expected = TARGETS[baseId(d._id)]
    const titleOk = d.title === expected
    const authored = d.authored ?? []
    console.log(
      `  ${d._id}\n` +
        `      title    ${JSON.stringify(d.title)} ${titleOk ? '✓' : `✖ expected ${JSON.stringify(expected)}`}\n` +
        `      refs     ${d.refs} ${d.refs === 0 ? '✓' : '✖'}\n` +
        `      authored ${authored.length ? `✖ ${authored.join(', ')}` : 'nothing ✓'}`,
    )
    if (!titleOk) problems.push(`${d._id}: title is ${JSON.stringify(d.title)}, expected ${JSON.stringify(expected)}`)
    if (d.refs !== 0) problems.push(`${d._id}: ${d.refs} inbound reference(s) — deleting would break them`)
    if (authored.length) problems.push(`${d._id}: has authored content (${authored.join(', ')})`)
  }

  if (problems.length) {
    console.error(`\n✖ ${problems.length} gate failure(s):`)
    for (const p of problems) console.error(`    ${p}`)
    fail('Aborted. Nothing has been deleted.')
  }
  console.log('\n✓ All gates passed — unreferenced, unauthored, titles as expected.')

  if (verifyOnly) return
  if (!write) {
    console.log(`\n${docs.length} document(s) would be DELETED PERMANENTLY:`)
    for (const d of docs) console.log(`    ${d._id}  ${d.title}`)
    console.log('\nDRY-RUN — re-run with --confirm to apply. Take a backup first.')
    return
  }

  const tx = client.transaction()
  for (const d of docs) tx.delete(d._id)
  await tx.commit({ visibility: 'sync' })
  console.log(`\n✓ Deleted ${docs.length} document(s).`)

  const left = await inspect()
  console.log(left.length === 0 ? '✓ Confirmed gone.' : `⚠️ ${left.length} still present — investigate.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
