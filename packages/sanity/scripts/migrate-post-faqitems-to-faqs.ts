/**
 * PROD-2293 — carry `post.faqItems` into the new shared `faqs` field.
 *
 * The typed member is identical (`faqItem` = {question, answer}), so this is a
 * verbatim copy of the array — each item already carries `_type: 'faqItem'` and
 * a `_key`. The reference member (`faqRef`) is new and authored by hand; this
 * only moves the existing typed Q&A.
 *
 * Idempotent: a post whose `faqs` is already set is skipped (never overwrites
 * hand-authored references). `faqItems` is left in place — its removal is a
 * follow-up PR once this is verified. Handles drafts. RUN BY A HUMAN.
 *
 *   pnpm --filter @pakfactory/sanity migrate:post-faqitems-to-faqs --dataset development
 *   ... --confirm
 *   ... --dataset production --confirm --yes-production
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
const write = confirm

type Doc = { _id: string; faqItems?: unknown[]; faqs?: unknown[] }

async function main() {
  console.log(`PROD-2293 post.faqItems → faqs — ${projectId}/${dataset}, mode ${write ? 'WRITE' : 'DRY-RUN'}\n`)

  const posts = await client.fetch<Doc[]>(
    `*[_type == "post" && count(faqItems) > 0]{ _id, faqItems, faqs }`,
    {},
    { perspective: 'raw' },
  )

  let moved = 0
  for (const p of posts) {
    if (Array.isArray(p.faqs) && p.faqs.length > 0) {
      console.log(`  skip ${p._id} — faqs already set (${p.faqs.length})`)
      continue
    }
    moved++
    console.log(`  ${p._id}: faqItems(${p.faqItems?.length ?? 0}) → faqs`)
    if (write) await client.patch(p._id).set({ faqs: p.faqItems }).commit({ visibility: 'async' })
  }

  console.log('')
  if (!moved) console.log('✓ Nothing to move — every post with faqItems already has faqs.')
  else console.log(write ? `✓ Done — ${moved} post(s) updated.` : `DRY-RUN — ${moved} post(s) would change. Re-run with --confirm.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
