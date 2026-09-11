/**
 * PROD-2454 — one concept, one name: `shortDescription` and `description`.
 *
 * The same idea carried four names across the product tree — `cardSummary` on
 * Line, `description` on Style and Product, `subheadline` on Solution — while
 * the long-form field was called `intro` on the two types that had one and was
 * missing on the other two. This copies every existing value onto the new key.
 *
 *   productLine.cardSummary  → productLine.shortDescription   (13 docs)
 *   productLine.intro        → productLine.description        (13 docs, portable text)
 *   solution.subheadline     → solution.shortDescription      (17 docs)
 *   solution.intro           → solution.description           (17 docs, portable text)
 *   productStyle.description → productStyle.shortDescription  (83 docs)
 *   product.description      → product.shortDescription       (304 docs)
 *
 * COPY ONLY — the old fields are left in place, marked `deprecated` in the
 * schema so the Studio renders them read-only with a visible reason (§4.3:
 * never remove a populated field in the change that stops using it). A
 * follow-up ticket unsets them and, on Style and Product, reuses the freed
 * `description` key for the long-form portable-text field.
 *
 * `caseStudy.cardSummary` and `page.subheadline` are DIFFERENT fields on
 * different types and are deliberately untouched — the case-study pages and
 * their JSON-LD read them today.
 *
 * Additive-safe and idempotent: only patches documents that have the old field
 * and not the new one, so re-running is a no-op.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:description-naming --dataset development
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
type Move = { type: string; from: string; to: string; expected: number; portableText?: boolean }

const MOVES: Move[] = [
  { type: 'productLine', from: 'cardSummary', to: 'shortDescription', expected: 13 },
  { type: 'productLine', from: 'intro', to: 'description', expected: 13, portableText: true },
  { type: 'solution', from: 'subheadline', to: 'shortDescription', expected: 17 },
  { type: 'solution', from: 'intro', to: 'description', expected: 17, portableText: true },
  { type: 'productStyle', from: 'description', to: 'shortDescription', expected: 83 },
  { type: 'product', from: 'description', to: 'shortDescription', expected: 304 },
]

type Doc = { _id: string; value: unknown }

/** Drafts and published both — perspective raw returns drafts.* alongside published. */
const pending = (m: Move) =>
  `*[_type == "${m.type}" && defined(${m.from}) && !defined(${m.to})]{ _id, "value": ${m.from} }`

function preview(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value.slice(0, 60))
  if (Array.isArray(value)) return `${value.length} block(s)`
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
    '\n  The old columns stay populated on purpose — the fields are deprecated,\n' +
      '  not removed. The follow-up ticket unsets them.\n',
  )
}

async function main() {
  console.log(
    `PROD-2454 description field naming — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )

  if (verifyOnly) {
    await report()
    return
  }

  let total = 0
  for (const m of MOVES) {
    const docs = await client.fetch<Doc[]>(pending(m), {}, { perspective: 'raw' })
    // `expected` is a production figure, so only production can meaningfully
    // drift from it. `development` is a separate dataset that has diverged
    // (91 styles / 336 products at the time of writing) — flagging that as
    // drift would be crying wolf on every dev run.
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
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
