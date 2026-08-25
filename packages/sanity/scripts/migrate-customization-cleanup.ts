/**
 * PROD-2250 — Customization cleanup (schema-side removals' data companion).
 *
 * Two idempotent passes, both safe (verified on production 2026-08-19):
 *
 *   1. customizationType.sharedSpecsNote — unset the orphaned help-text value.
 *      9 types hold it; the field is removed from the schema in the same PR.
 *
 *   2. customizationOption capability→customization field rename:
 *        applicableCapabilities → applicableCustomizations
 *        relatedCapabilities    → relatedCustomizations
 *      Copies the array to the new key (only if the new key is unset) then unsets
 *      the old key. 0 options populate either on prod, so this is a no-op there —
 *      it exists for drafts / the development dataset, where values may linger.
 *
 * Reads drafts too (perspective raw handled per-id). Written by an agent,
 * RUN BY A HUMAN (AGENTS.md § Sanity content). Dry-run is the default.
 *
 *   pnpm --filter @pakfactory/sanity migrate:customization-cleanup --dataset development
 *   ... --confirm                                   # apply
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

type Doc = Record<string, unknown> & { _id: string; _type: string }

async function main() {
  console.log(`PROD-2250 customization cleanup — ${projectId}/${dataset}, mode ${write ? 'WRITE' : 'DRY-RUN'}\n`)

  // 1) sharedSpecsNote — unset on every customizationType (published + drafts).
  const types = await client.fetch<Doc[]>(
    `*[_type == "customizationType" && defined(sharedSpecsNote)]{ _id }`,
    {},
    { perspective: 'raw' },
  )
  console.log(`sharedSpecsNote set on ${types.length} type document(s).`)
  for (const t of types) {
    console.log(`  unset ${t._id}.sharedSpecsNote`)
    if (write) await client.patch(t._id).unset(['sharedSpecsNote']).commit({ visibility: 'async' })
  }

  // 2) capability → customization field rename on customizationOption.
  const renames: [from: string, to: string][] = [
    ['applicableCapabilities', 'applicableCustomizations'],
    ['relatedCapabilities', 'relatedCustomizations'],
  ]
  for (const [from, to] of renames) {
    const opts = await client.fetch<Doc[]>(
      `*[_type == "customizationOption" && defined(${from})]{ _id, "from": ${from}, "to": ${to} }`,
      {},
      { perspective: 'raw' },
    )
    console.log(`\n${from} → ${to}: ${opts.length} option document(s).`)
    for (const o of opts) {
      const hasNew = Array.isArray(o.to) && o.to.length > 0
      console.log(`  ${o._id}: ${hasNew ? 'new key already set → unset old only' : 'copy → new, unset old'}`)
      if (write) {
        const patch = client.patch(o._id)
        if (!hasNew) patch.setIfMissing({ [to]: o.from })
        patch.unset([from])
        await patch.commit({ visibility: 'async' })
      }
    }
  }

  console.log('')
  console.log(write ? '✓ Done.' : 'DRY-RUN — re-run with --confirm to apply.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
