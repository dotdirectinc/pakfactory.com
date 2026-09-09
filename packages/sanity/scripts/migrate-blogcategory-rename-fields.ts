/**
 * PROD-2293 — rename blogCategory fields to their real names.
 *
 *   shortDescription → summary    (text)
 *   bannerImage      → heroImage  (image object — asset + alt, copied verbatim)
 *
 * Idempotent: a category whose new field is already set is skipped. Leaves the old
 * fields in place — their removal is a follow-up PR once verified (the query reads
 * the new field and falls back to the old, so the blog app never breaks). Handles
 * drafts. RUN BY A HUMAN.
 *
 *   pnpm --filter @pakfactory/sanity migrate:blogcategory-rename-fields --dataset development
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

type Doc = {
  _id: string
  shortDescription?: string
  summary?: string
  bannerImage?: unknown
  heroImage?: unknown
}

async function main() {
  console.log(`PROD-2293 blogCategory field rename — ${projectId}/${dataset}, mode ${write ? 'WRITE' : 'DRY-RUN'}\n`)

  const cats = await client.fetch<Doc[]>(
    `*[_type == "blogCategory" && (defined(shortDescription) || defined(bannerImage))]{
      _id, shortDescription, summary, bannerImage, heroImage
    }`,
    {},
    { perspective: 'raw' },
  )

  let changed = 0
  for (const c of cats) {
    const set: Record<string, unknown> = {}
    if (c.shortDescription !== undefined && c.summary === undefined) set.summary = c.shortDescription
    if (c.bannerImage !== undefined && c.heroImage === undefined) set.heroImage = c.bannerImage
    const keys = Object.keys(set)
    if (keys.length === 0) {
      console.log(`  skip ${c._id} — new field(s) already set`)
      continue
    }
    changed++
    console.log(`  ${c._id}: set ${keys.join(' + ')}`)
    if (write) await client.patch(c._id).set(set).commit({ visibility: 'async' })
  }

  console.log('')
  if (!changed) console.log('✓ Nothing to move — every category already has its new fields.')
  else console.log(write ? `✓ Done — ${changed} category(ies) updated.` : `DRY-RUN — ${changed} would change. Re-run with --confirm.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
