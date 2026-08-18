/**
 * PROD-2315 (B6) — remove the stray `promoBanner` section from the blog 404 page.
 *
 * `blogNotFoundPage.pageBuilder` carries a section of type `promoBanner`, which
 * is not in the schema — it renders as nothing on the live site and shows as an
 * unknown-type warning in the Studio. Decision (2026-08-18): the 404 page does
 * NOT get a promo section, so the stray entry is removed. Data-only; there is no
 * `promoBanner` schema type to change.
 *
 * Generic and idempotent: drops every `promoBanner` array member from the
 * pageBuilder of blogNotFoundPage (published + draft). Written by an agent, RUN
 * BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:remove-404-promobanner --dataset development
 *   ... --confirm                                       # apply (dry-run is default)
 *   ... --dataset production --confirm --yes-production
 *   ... --dataset production --verify                   # read-only
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

const TARGET_IDS = ['blogNotFoundPage', 'drafts.blogNotFoundPage']
const STRAY_TYPE = 'promoBanner'

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

type Section = { _key?: string; _type?: string }
type Doc = { _id: string; pageBuilder?: Section[] }

async function main() {
  console.log(`PROD-2315 remove 404 ${STRAY_TYPE} — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`)
  const docs = await client.fetch<Doc[]>(
    `*[_id in $ids]{ _id, pageBuilder[]{ _key, _type } }`,
    { ids: TARGET_IDS },
    { perspective: 'raw' },
  )

  let touched = 0
  const tx = client.transaction()
  for (const doc of docs) {
    const strays = (doc.pageBuilder ?? []).filter((s) => s._type === STRAY_TYPE && s._key)
    if (strays.length === 0) {
      console.log(`  ${doc._id}: no ${STRAY_TYPE} — skip`)
      continue
    }
    touched++
    console.log(`  ${doc._id}: removing ${strays.length} ${STRAY_TYPE} section(s)`)
    if (write) {
      tx.patch(client.patch(doc._id).unset(strays.map((s) => `pageBuilder[_key=="${s._key}"]`)))
    }
  }

  if (verifyOnly) {
    console.log(touched === 0 ? '\n✓ No stray promoBanner sections remain.' : `\n⚠ ${touched} doc(s) still carry a promoBanner section.`)
    return
  }
  if (!write) {
    console.log(`\nDRY-RUN — ${touched} doc(s) would change. Re-run with --confirm.`)
    return
  }
  if (touched > 0) await tx.commit({ visibility: 'async' })
  console.log(`\n✓ Removed the stray section from ${touched} doc(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
