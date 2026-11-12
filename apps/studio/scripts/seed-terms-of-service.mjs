#!/usr/bin/env node
/**
 * Replace the pinned Legal Page `termsPage` body with live Terms & Conditions
 * from https://pakfactory.com/terms-conditions (last updated 2021-03-31).
 *
 * CREATE-OR-REPLACE on `termsPage`. The stub from seed-static-pages is
 * create-if-missing only and will not update an existing termsPage — this
 * script is what fills real copy.
 *
 * Privacy Policy links remap to `/policies/privacy-policy`. Artwork guideline
 * links stay absolute on pakfactory.com.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:terms-of-service -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:terms-of-service -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:terms-of-service -- --dataset production --confirm --yes-production
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseScriptArgs, describeMode} from './lib/script-args.mjs'
import {
  TERMS_LAST_UPDATED,
  TERMS_META_DESCRIPTION,
  TERMS_SECTIONS,
} from './data/terms-of-service-body.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:terms-of-service -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.

  Replaces title, lastUpdated, SEO fields, and body on pinned id termsPage.`

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

const TERMS_ID = 'termsPage'

/**
 * @param {{text: string, strong?: boolean, href?: string}[]} spans
 * @param {string} keyBase
 */
function childrenFromSpans(spans, keyBase) {
  const markDefs = []
  const children = []
  let i = 0
  for (const span of spans) {
    const marks = []
    if (span.strong) marks.push('strong')
    if (span.href) {
      const linkKey = `${keyBase}-l${i}`
      markDefs.push({_key: linkKey, _type: 'link', href: span.href})
      marks.push(linkKey)
    }
    children.push({
      _type: 'span',
      _key: `${keyBase}-s${i}`,
      text: span.text,
      marks,
    })
    i += 1
  }
  return {children, markDefs}
}

function buildBody() {
  const blocks = []
  let n = 0
  for (const section of TERMS_SECTIONS) {
    const hKey = `h${n++}`
    blocks.push({
      _type: 'block',
      _key: hKey,
      style: 'h3',
      markDefs: [],
      children: [
        {_type: 'span', _key: `${hKey}-span`, text: section.heading, marks: []},
      ],
    })
    for (const part of section.parts) {
      if (part.type === 'p') {
        const key = `p${n++}`
        const {children, markDefs} = childrenFromSpans(part.spans, key)
        blocks.push({
          _type: 'block',
          _key: key,
          style: 'normal',
          markDefs,
          children,
        })
        continue
      }
      for (const item of part.items) {
        const key = `li${n++}`
        const {children, markDefs} = childrenFromSpans(item, key)
        blocks.push({
          _type: 'block',
          _key: key,
          style: 'normal',
          listItem: 'bullet',
          level: 1,
          markDefs,
          children,
        })
      }
    }
  }
  return blocks
}

function buildDoc(body) {
  return {
    _id: TERMS_ID,
    _type: 'legalPage',
    title: 'Terms of Service',
    lastUpdated: TERMS_LAST_UPDATED,
    metaTitle: 'Terms of Service',
    metaDescription: TERMS_META_DESCRIPTION,
    allowIndex: true,
    allowFollow: true,
    body,
  }
}

async function seed() {
  const mode = describeMode({confirm: apply, dataset: DATASET})
  console.log(`\n🌱  Terms of Service → ${DATASET} (${PROJECT_ID}) — ${mode}\n`)

  const existing = await client.fetch(
    `*[_id == $id || _id == "drafts." + $id][0]{_id, title, lastUpdated, "bodyLen": count(body)}`,
    {id: TERMS_ID},
  )
  const body = buildBody()
  const doc = buildDoc(body)
  const action = existing ? 'REPLACE' : 'CREATE'

  console.log(`  [${action}] ${TERMS_ID} → /policies/terms-of-service`)
  console.log(`    sections: ${TERMS_SECTIONS.length}`)
  console.log(`    blocks:   ${body.length}`)
  if (existing) {
    console.log(
      `    before:   id=${existing._id} lastUpdated=${existing.lastUpdated ?? '—'} bodyLen=${existing.bodyLen ?? 0}`,
    )
  }
  console.log(`    after:    lastUpdated=${TERMS_LAST_UPDATED} bodyLen=${body.length}`)

  if (!apply) {
    console.log(
      `\nDry run on dataset=${DATASET} — would ${action} ${TERMS_ID}. Pass --confirm to write.\n`,
    )
    return
  }

  if (DATASET === 'production' && !args.yesProduction) {
    console.error('❌  Production writes need --yes-production.')
    process.exit(1)
  }

  await client.createOrReplace(doc)
  console.log(
    `\n✅  ${action}d ${TERMS_ID} on dataset=${DATASET}. Docs are written as published ids — open Studio or /policies/terms-of-service to verify.\n`,
  )
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
