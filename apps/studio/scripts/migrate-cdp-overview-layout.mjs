#!/usr/bin/env node
/**
 * Unify CDP overview sections onto a single `customizationOverview` type and
 * drop the retired `layout` field (PROD-3127).
 *
 * For each `customizationDetailPage` (published + drafts):
 *   customizationOverviewStandard   → customizationOverview (no layout)
 *   customizationOverviewLearnFirst → customizationOverview (no layout)
 *   customizationOverview with layout set → unset layout
 *
 * Preserves `_key` and rail chrome (showCta, showBookmark, configurationSource,
 * padding/borders). Idempotent.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run migrate:cdp-overview-layout -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:cdp-overview-layout -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:cdp-overview-layout -- --dataset production --confirm --yes-production
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describeMode, parseScriptArgs} from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:cdp-overview-layout -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({usage: USAGE})
const {confirm: apply} = args

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error(
    '❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN).',
  )
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw',
})

const LEGACY_TYPES = new Set([
  'customizationOverviewStandard',
  'customizationOverviewLearnFirst',
])

function migrateSections(sections) {
  if (!Array.isArray(sections)) return {sections, changed: 0}
  let changed = 0
  const next = sections.map((section) => {
    if (!section || typeof section !== 'object') return section

    const isLegacyType = LEGACY_TYPES.has(section._type)
    const hasLayout = Object.prototype.hasOwnProperty.call(section, 'layout')
    const isUnified = section._type === 'customizationOverview'

    if (!isLegacyType && !(isUnified && hasLayout)) return section

    changed += 1
    const {layout: _dropLayout, _type: _legacyType, ...rest} = section
    return {
      ...rest,
      _type: 'customizationOverview',
    }
  })
  return {sections: next, changed}
}

async function main() {
  console.log(
    `\nmigrate:cdp-overview-layout  project=${PROJECT_ID}  dataset=${DATASET}  ${describeMode(args)}\n`,
  )

  const docs = await client.fetch(
    `*[_type == "customizationDetailPage"]{_id, title, sections}`,
  )

  const plans = []
  for (const doc of docs) {
    const {sections, changed} = migrateSections(doc.sections)
    if (!changed) continue
    plans.push({
      id: doc._id,
      title: doc.title || doc._id,
      changed,
      sections,
    })
  }

  if (plans.length === 0) {
    console.log(
      `Nothing to do on dataset=${DATASET} — no legacy overview types or layout fields.\n`,
    )
    return
  }

  for (const plan of plans) {
    console.log(
      `  [${apply ? 'PATCH' : 'WOULD PATCH'}] ${plan.id} (${plan.title}) — ${plan.changed} overview section(s)`,
    )
  }

  if (!apply) {
    console.log(
      `\nDry run on dataset=${DATASET} — pass --confirm to write.\n`,
    )
    return
  }

  if (DATASET === 'production' && !args.yesProduction) {
    console.error('❌  Production writes need --yes-production.')
    process.exit(1)
  }

  const tx = client.transaction()
  for (const plan of plans) {
    tx.patch(plan.id, {set: {sections: plan.sections}})
  }
  await tx.commit()
  console.log(
    `\n✅  Migrated ${plans.length} customizationDetailPage document(s).\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
