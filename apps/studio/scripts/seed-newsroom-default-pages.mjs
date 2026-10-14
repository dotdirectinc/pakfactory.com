#!/usr/bin/env node
/**
 * Seed the two Newsroom Default layout documents (PROD-2909).
 *
 *   newsroomCatalogPage  → /newsroom listing layout
 *   newsroomDetailPage   → /newsroom/[slug] release layout
 *
 * Both carry the fixed ids the front end and `pressRelease.template` fall back
 * to, the same convention Products uses (`productDetailPage`, …). Stable
 * `_key`s so re-runs are idempotent: an existing band is left exactly as the
 * editor arranged it, and only missing bands are appended.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:newsroom-default-pages -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:newsroom-default-pages -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:newsroom-default-pages -- --dataset production --confirm --yes-production
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseScriptArgs} from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:newsroom-default-pages -- --dataset <development|production> [--confirm] [--yes-production]

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

/**
 * The media-inquiries band. `generalCta` already is this section — heading,
 * body line, button and theme — so the newsroom needs no section type of its
 * own for it.
 *
 * The button stays on /contact rather than `mailto:press@…`: `externalUrl` is a
 * `url` field with Sanity's default scheme rule (http/https), so a mailto would
 * not validate. The address lives in the body line, and in Global Settings →
 * Company → Organization → Contact info → Media enquiries email, which is what
 * the front end reads.
 */
const mediaCta = {
  _type: 'generalCta',
  _key: 'newsroom-media-inquiries',
  heading: 'Media inquiries',
  body: 'For interviews, assets or comment, email press@pakfactory.com.',
  link: {
    label: 'Contact us',
    linkType: 'path',
    relativePath: '/contact',
  },
}

const TARGETS = [
  {
    id: 'newsroomCatalogPage',
    type: 'newsroomCatalogPage',
    title: 'Default',
    // The release list itself is route-owned; this is what sits below it.
    sections: [mediaCta],
  },
  {
    id: 'newsroomDetailPage',
    type: 'newsroomDetailPage',
    title: 'Default',
    sections: [
      {
        _type: 'pressReleasesRow',
        _key: 'newsroom-more-announcements',
        heading: 'More announcements',
        count: 3,
        // `curatedItems` deliberately left empty. `pressReleasesRow` has no
        // `sourceTo` — press-release categories are a string enum, not
        // documents — so the factory gives it curation + count and no List
        // source control. Empty therefore means "the latest `count` releases,
        // excluding the one being read", resolved in GROQ, the same contract
        // `post.relatedPosts` already has. Pin releases here to override it.
      },
      mediaCta,
    ],
  },
]

/** Append any missing default band by `_key`; never reorder or rewrite one. */
function ensureDefaultBands(existing, defaults) {
  const sections = Array.isArray(existing) ? [...existing] : []
  const keys = new Set(sections.map((s) => s?._key).filter(Boolean))
  let changed = false
  for (const band of defaults) {
    if (keys.has(band._key)) continue
    sections.push(band)
    keys.add(band._key)
    changed = true
  }
  return {sections, changed}
}

async function seed() {
  console.log(`\n🌱  Newsroom default pages → ${DATASET} (${PROJECT_ID})\n`)

  const plans = []
  for (const target of TARGETS) {
    const doc = await client.fetch(
      `*[_id == $id || _id == "drafts." + $id] | order(_updatedAt desc)[0]{
        _id,
        _type,
        title,
        previewImage,
        featured,
        sections
      }`,
      {id: target.id},
    )
    const {sections, changed} = ensureDefaultBands(doc?.sections, target.sections)
    const nextDoc = {
      _id: target.id,
      _type: target.type,
      title: doc?.title?.trim() || target.title,
      sections,
    }
    if (doc?.previewImage) nextDoc.previewImage = doc.previewImage
    if (doc?.featured) nextDoc.featured = doc.featured

    const isCreate = !doc
    plans.push({
      target,
      isCreate,
      changed: isCreate || changed,
      nextDoc,
      existingKeys: (doc?.sections ?? []).map((s) => s?._key).filter(Boolean),
    })
  }

  for (const plan of plans) {
    const label = plan.isCreate ? 'CREATE' : plan.changed ? 'PATCH' : 'OK'
    console.log(
      `  [${label}] ${plan.target.id} (${plan.target.type}) — sections: ${plan.nextDoc.sections.length}`,
    )
    if (plan.changed && !plan.isCreate) {
      const added = plan.nextDoc.sections
        .map((s) => s._key)
        .filter((k) => !plan.existingKeys.includes(k))
      if (added.length) console.log(`           append keys: ${added.join(', ')}`)
    }
  }

  if (!apply) {
    console.log('\nDry run — pass --confirm to write.\n')
    return
  }

  if (DATASET === 'production' && !args.yesProduction) {
    console.error('❌  Production writes need --yes-production.')
    process.exit(1)
  }

  const tx = client.transaction()
  for (const plan of plans) {
    if (!plan.changed) continue
    tx.createOrReplace(plan.nextDoc)
  }
  await tx.commit()
  console.log('\n✅  Newsroom default pages written.\n')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
