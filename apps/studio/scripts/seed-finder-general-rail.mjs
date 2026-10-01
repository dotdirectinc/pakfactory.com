#!/usr/bin/env node
/**
 * Surgically fill General rail buckets on the first `heroFinder` section of
 * `homePage` — does **not** reorder sections or rewrite other blocks.
 *
 * Prefer this over `seed:home-page` when the live Home order must stay put.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents.
 *
 *   pnpm --filter @pakfactory/studio run seed:finder-general -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:finder-general -- --dataset development --confirm
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describeMode, parseScriptArgs} from './lib/script-args.mjs'
import {buildFinderGeneralBuckets} from './lib/finder-general-buckets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:finder-general -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({usage: USAGE})
const {confirm: apply} = args
const DATASET = args.dataset

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN).')
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

const HOME_ID = 'homePage'
const PUBLISHED = '!(_id in path("drafts.**"))'
const LINE_VISIBLE = '(!defined(status) || status == "active") && customerFacing != false'

const CANDIDATES_QUERY = /* groq */ `{
  "caseStudies": *[_type == "caseStudy" && ${PUBLISHED} && defined(slug.current)
    && (defined(heroMedia.image.asset) || defined(cardImage.asset) || defined(heroMedia.videoThumbnail.asset))]
    | order(publishedAt desc)[0...3]{_id, title},
  "lines": *[_type == "productLine" && ${PUBLISHED} && defined(slug.current) && ${LINE_VISIBLE}]{
      _id, title, "hasImage": defined(featuredImage.asset)
    } | order(hasImage desc, title asc)[0...4],
  "industries": *[_type == "solution" && ${PUBLISHED} && defined(slug.current) && hasPage == true]{
      _id, title, "studies": count(relatedCaseStudies)
    } | order(studies desc, title asc)[0...4],
  "stages": *[_type == "expertiseStage" && ${PUBLISHED} && defined(slug.current)
    && (!defined(status) || status in ["active", "coming-soon"])]{_id, title},
  "customizations": *[_type == "customizationType" && ${PUBLISHED} && defined(title)]
    | order(title asc)[0...4]{_id, title}
}`

function countBucket(items) {
  return Array.isArray(items) ? items.length : 0
}

function patchSections(sections, buckets) {
  const list = Array.isArray(sections) ? sections : []
  const index = list.findIndex((section) => section?._type === 'heroFinder')
  if (index === -1) return {ok: false, sections: list, key: null, index: -1}

  const current = list[index]
  const next = {
    ...current,
    ...buckets,
  }
  const updated = list.map((section, i) => (i === index ? next : section))
  return {ok: true, sections: updated, key: current._key ?? null, index}
}

async function seed() {
  console.log(
    `\n🌱  Finder General rail → dataset=${DATASET} (${PROJECT_ID}) · ${describeMode({confirm: apply, dataset: DATASET})}\n`,
  )

  const candidates = await client.fetch(CANDIDATES_QUERY)
  const buckets = buildFinderGeneralBuckets(candidates)

  console.log('  Candidates → bucket sizes:')
  console.log(`    products:       ${countBucket(buckets.generalProducts)}`)
  console.log(`    industries:     ${countBucket(buckets.generalIndustries)}`)
  console.log(`    customizations: ${countBucket(buckets.generalCustomizations)}`)
  console.log(`    expertise:      ${countBucket(buckets.generalExpertise)}`)
  console.log(`    case studies:   ${countBucket(buckets.generalCaseStudies)}`)
  console.log(`    railOrder:      ${buckets.railOrder}`)

  const docs = await client.fetch(
    `*[_id in [$id, "drafts." + $id]]{_id, sections[]{_key, _type}}`,
    {id: HOME_ID},
  )
  const published = docs.find((d) => d._id === HOME_ID)
  const draft = docs.find((d) => d._id === `drafts.${HOME_ID}`)

  if (!published && !draft) {
    console.log(`\n  No homePage on dataset=${DATASET} — nothing to patch.\n`)
    return
  }

  const fullDocs = await client.fetch(
    `*[_id in [$id, "drafts." + $id]]{_id, sections}`,
    {id: HOME_ID},
  )

  const plans = []
  for (const doc of fullDocs) {
    const result = patchSections(doc.sections, buckets)
    if (!result.ok) {
      console.log(
        `\n  ${doc._id}: no heroFinder section — skip (order untouched on dataset=${DATASET}).`,
      )
      continue
    }
    plans.push({
      id: doc._id,
      key: result.key,
      index: result.index,
      before: Array.isArray(doc.sections) ? doc.sections.length : 0,
      after: result.sections.length,
      sections: result.sections,
    })
  }

  if (plans.length === 0) {
    console.log(`\n  Nothing to write on dataset=${DATASET}.\n`)
    return
  }

  for (const plan of plans) {
    console.log(
      `  ${plan.id}: patch heroFinder _key=${plan.key ?? '(none)'} at index ${plan.index} · sections ${plan.before} → ${plan.after} (order preserved)`,
    )
  }

  if (!apply) {
    console.log(
      `\n  DRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`,
    )
    return
  }

  const tx = client.transaction()
  for (const plan of plans) {
    tx.patch(plan.id, (p) => p.set({sections: plan.sections}))
  }
  await tx.commit()
  console.log(`\n  ✓  Wrote General buckets on dataset=${DATASET}.\n`)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
