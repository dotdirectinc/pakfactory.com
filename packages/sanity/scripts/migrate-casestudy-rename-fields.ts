/**
 * PROD-2293 — rename caseStudy fields to their real names.
 *
 *   expertiseAreas → expertise      (reference array, expertiseStage)
 *   capabilities   → customizations (reference array, customizationOption)
 *
 * Verbatim copy of each ref array to the new field (same shape). Idempotent: a
 * study whose new field is already set is skipped. Leaves the old fields in place
 * — their removal is a follow-up PR once this is verified (the query reads the new
 * field and falls back to the old until then, so the www app never breaks).
 * Handles drafts. RUN BY A HUMAN.
 *
 *   pnpm --filter @pakfactory/sanity migrate:casestudy-rename-fields --dataset development
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
  expertiseAreas?: unknown[]
  expertise?: unknown[]
  capabilities?: unknown[]
  customizations?: unknown[]
}

async function main() {
  console.log(`PROD-2293 caseStudy field rename — ${projectId}/${dataset}, mode ${write ? 'WRITE' : 'DRY-RUN'}\n`)

  const studies = await client.fetch<Doc[]>(
    `*[_type == "caseStudy" && (count(expertiseAreas) > 0 || count(capabilities) > 0)]{
      _id, expertiseAreas, expertise, capabilities, customizations
    }`,
    {},
    { perspective: 'raw' },
  )

  let changed = 0
  for (const s of studies) {
    const set: Record<string, unknown[]> = {}
    if (Array.isArray(s.expertiseAreas) && s.expertiseAreas.length > 0 && !(s.expertise?.length)) {
      set.expertise = s.expertiseAreas
    }
    if (Array.isArray(s.capabilities) && s.capabilities.length > 0 && !(s.customizations?.length)) {
      set.customizations = s.capabilities
    }
    const keys = Object.keys(set)
    if (keys.length === 0) {
      console.log(`  skip ${s._id} — new field(s) already set`)
      continue
    }
    changed++
    console.log(`  ${s._id}: set ${keys.join(' + ')}`)
    if (write) await client.patch(s._id).set(set).commit({ visibility: 'async' })
  }

  console.log('')
  if (!changed) console.log('✓ Nothing to move — every study already has its new fields.')
  else console.log(write ? `✓ Done — ${changed} study(ies) updated.` : `DRY-RUN — ${changed} would change. Re-run with --confirm.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
