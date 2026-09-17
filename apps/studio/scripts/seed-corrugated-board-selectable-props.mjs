#!/usr/bin/env node
/**
 * Seed selectable Color + Finish Type onto Corrugated Board / White Lined
 * Corrugated Board so the www detail config rail can be exercised on development
 * (PROD-1299).
 *
 * Existing Property + Property Value documents are reused (Color, Finish Type).
 * This script only:
 *   1. Declares those properties as `selectable` on Type `corrugated-board`
 *   2. Sets `valuesPerItem: "one"` on those Properties when unset
 *   3. Points Option `white-lined-corrugated-board` at six Property Values
 *
 * Idempotent. Does not create Property / Property Value documents.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:corrugated-selectable-props -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:corrugated-selectable-props -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:corrugated-selectable-props -- --dataset production --confirm --yes-production
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:corrugated-selectable-props -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

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

const TYPE_SLUG = 'corrugated-board'
const OPTION_SLUG = 'white-lined-corrugated-board'
const SELECTABLE_PROP_SLUGS = ['color', 'finish-type']
const OPTION_VALUE_SLUGS = [
  'color-white',
  'color-brown',
  'color-black',
  'finish-gloss',
  'finish-matte',
  'finish-soft-touch',
]

function publishedId(id) {
  return id.replace(/^drafts\./, '')
}

function ref(id, key) {
  return { _type: 'reference', _ref: publishedId(id), _key: key }
}

function sameRefs(a, b) {
  const left = (a ?? []).map((r) => r?._ref).filter(Boolean).sort().join('|')
  const right = (b ?? []).map((r) => r?._ref).filter(Boolean).sort().join('|')
  return left === right
}

function declaredMatches(existing, next) {
  const leftRows = existing ?? []
  const rightRows = next ?? []
  if (leftRows.length !== rightRows.length) return false
  const key = (row) =>
    `${row?.property?._ref ?? row?.property ?? ''}:${row?.usage ?? ''}`
  const left = leftRows.map(key).sort().join('|')
  const right = rightRows.map(key).sort().join('|')
  return left === right
}

async function main() {
  console.log(
    `\nseed:corrugated-selectable-props  project=${PROJECT_ID}  dataset=${DATASET}  ${describeMode(args)}\n`,
  )

  const type = await client.fetch(
    `*[
      _type == "customizationType" &&
      slug.current == $slug &&
      !(_id in path("drafts.**"))
    ][0]{ _id, title, properties }`,
    { slug: TYPE_SLUG },
  )
  if (!type?._id) {
    console.error(`❌  No published Type with slug "${TYPE_SLUG}" in ${DATASET}.`)
    process.exit(1)
  }

  const option = await client.fetch(
    `*[
      _type == "customizationOption" &&
      slug.current == $slug &&
      !(_id in path("drafts.**"))
    ][0]{ _id, title, properties }`,
    { slug: OPTION_SLUG },
  )
  if (!option?._id) {
    console.error(
      `❌  No published Option with slug "${OPTION_SLUG}" in ${DATASET}.`,
    )
    process.exit(1)
  }

  const properties = await client.fetch(
    `*[
      _type == "property" &&
      slug.current in $slugs &&
      !(_id in path("drafts.**"))
    ]{ _id, title, "slug": slug.current, valuesPerItem }`,
    { slugs: SELECTABLE_PROP_SLUGS },
  )
  const propBySlug = new Map(properties.map((p) => [p.slug, p]))
  for (const slug of SELECTABLE_PROP_SLUGS) {
    if (!propBySlug.has(slug)) {
      console.error(`❌  Missing Property slug "${slug}" in ${DATASET}.`)
      process.exit(1)
    }
  }

  const values = await client.fetch(
    `*[
      _type == "propertyValue" &&
      slug.current in $slugs &&
      !(_id in path("drafts.**"))
    ]{ _id, title, "slug": slug.current, "propSlug": property->slug.current }`,
    { slugs: OPTION_VALUE_SLUGS },
  )
  const valueBySlug = new Map(values.map((v) => [v.slug, v]))
  for (const slug of OPTION_VALUE_SLUGS) {
    if (!valueBySlug.has(slug)) {
      console.error(`❌  Missing Property Value slug "${slug}" in ${DATASET}.`)
      process.exit(1)
    }
  }

  const nextDeclared = SELECTABLE_PROP_SLUGS.map((slug) => {
    const prop = propBySlug.get(slug)
    return {
      _type: 'declaredProperty',
      _key: `dp-${slug}`,
      usage: 'selectable',
      property: { _type: 'reference', _ref: prop._id },
    }
  })

  const nextOptionProps = OPTION_VALUE_SLUGS.map((slug) => {
    const value = valueBySlug.get(slug)
    return ref(value._id, `pv-${slug}`)
  })

  console.log(`Type:   ${type.title} (${type._id})`)
  console.log(
    `  declare selectable → ${SELECTABLE_PROP_SLUGS.map((s) => propBySlug.get(s).title).join(', ')}`,
  )
  console.log(`Option: ${option.title} (${option._id})`)
  console.log(
    `  properties → ${OPTION_VALUE_SLUGS.map((s) => valueBySlug.get(s).title).join(', ')}`,
  )

  const propsNeedingCardinality = SELECTABLE_PROP_SLUGS.map((slug) =>
    propBySlug.get(slug),
  ).filter((p) => p.valuesPerItem !== 'one' && p.valuesPerItem !== 'many')

  if (propsNeedingCardinality.length) {
    console.log(
      `\nProperty valuesPerItem → one: ${propsNeedingCardinality.map((p) => p.title).join(', ')}`,
    )
  }

  const typeNeedsPatch = !declaredMatches(type.properties, nextDeclared)
  const optionNeedsPatch = !sameRefs(option.properties, nextOptionProps)
  const writes =
    (typeNeedsPatch ? 1 : 0) +
    (optionNeedsPatch ? 1 : 0) +
    propsNeedingCardinality.length

  if (!writes) {
    console.log(
      `\n✅  Nothing to do — ${DATASET} already has the selectable Corrugated Board wiring.\n`,
    )
    return
  }

  if (!apply) {
    console.log(
      `\n${writes} write(s) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`,
    )
    return
  }

  const tx = client.transaction()
  if (typeNeedsPatch) {
    tx.patch(type._id, (patch) => patch.set({ properties: nextDeclared }))
  }
  if (optionNeedsPatch) {
    tx.patch(option._id, (patch) => patch.set({ properties: nextOptionProps }))
  }
  for (const prop of propsNeedingCardinality) {
    tx.patch(prop._id, (patch) => patch.set({ valuesPerItem: 'one' }))
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅  Applied ${writes} write(s) in ${DATASET}.`)
  console.log(
    `    Preview: /customizations/materials/${OPTION_SLUG}\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
