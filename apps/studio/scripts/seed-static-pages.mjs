#!/usr/bin/env node
/**
 * Seed stub Content Pages and Legal Pages for www static routes (PROD-2658).
 *
 * CREATE-IF-MISSING only. Existing documents (published or draft) are left
 * untouched — Privacy on development already has real copy.
 *
 *   aboutPage     → /about
 *   contactPage   → /contact
 *   privacyPage   → /policies/privacy-policy
 *   termsPage     → /policies/terms-of-service
 *   contentPage-sustainability (slug sustainability) → /sustainability
 *   searchPage    → reserved (no www route yet)
 *   notFoundPage  → reserved (no www route yet)
 *
 * Stubs are titles (+ legal date / placeholder body). Contact phone, email,
 * address and hours stay on Global Settings — not on contactPage.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:static-pages -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:static-pages -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:static-pages -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:static-pages -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.

  Existing docs are never modified — only missing ids (or sustainability slug) are created.`

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

function stubParagraph(text, key = 'stub-body') {
  return [
    {
      _type: 'block',
      _key: key,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: `${key}-span`,
          text,
          marks: [],
        },
      ],
    },
  ]
}

/** Pinned pages keyed by semantic `_id`. */
const PINNED = [
  {
    id: 'aboutPage',
    route: '/about',
    doc: {
      _id: 'aboutPage',
      _type: 'contentPage',
      title: 'About PakFactory',
      metaTitle: 'About PakFactory',
      metaDescription:
        'Learn about PakFactory — custom packaging design, manufacturing, and fulfillment.',
      allowIndex: true,
      allowFollow: true,
      sections: [],
    },
  },
  {
    id: 'contactPage',
    route: '/contact',
    doc: {
      _id: 'contactPage',
      _type: 'contentPage',
      title: 'Contact',
      metaTitle: 'Contact PakFactory',
      metaDescription:
        'Talk to PakFactory packaging experts. Request a quote or reach our team.',
      allowIndex: true,
      allowFollow: true,
      sections: [],
    },
  },
  {
    id: 'privacyPage',
    route: '/policies/privacy-policy',
    doc: {
      _id: 'privacyPage',
      _type: 'legalPage',
      title: 'Privacy Policy',
      lastUpdated: '2026-01-01',
      metaTitle: 'Privacy Policy',
      metaDescription: 'PakFactory privacy policy.',
      allowIndex: true,
      allowFollow: true,
      body: stubParagraph(
        'Replace with approved Privacy Policy copy before launch.',
        'privacy-stub',
      ),
    },
  },
  {
    id: 'termsPage',
    route: '/policies/terms-of-service',
    doc: {
      _id: 'termsPage',
      _type: 'legalPage',
      title: 'Terms of Service',
      lastUpdated: '2026-01-01',
      metaTitle: 'Terms of Service',
      metaDescription: 'PakFactory terms of service.',
      allowIndex: true,
      allowFollow: true,
      body: stubParagraph(
        'Replace with approved Terms of Service copy before launch.',
        'terms-stub',
      ),
    },
  },
  {
    id: 'searchPage',
    route: '(reserved — no www route yet)',
    doc: {
      _id: 'searchPage',
      _type: 'contentPage',
      title: 'Search',
      metaTitle: 'Search',
      allowIndex: false,
      allowFollow: true,
      sections: [],
    },
  },
  {
    id: 'notFoundPage',
    route: '(reserved — no www route yet)',
    doc: {
      _id: 'notFoundPage',
      _type: 'contentPage',
      title: '404',
      metaTitle: 'Page not found',
      allowIndex: false,
      allowFollow: true,
      sections: [],
    },
  },
]

const SUSTAINABILITY = {
  id: 'contentPage-sustainability',
  slug: 'sustainability',
  route: '/sustainability',
  doc: {
    _id: 'contentPage-sustainability',
    _type: 'contentPage',
    title: 'Sustainability',
    slug: {_type: 'slug', current: 'sustainability'},
    metaTitle: 'Sustainability',
    metaDescription:
      'How PakFactory approaches sustainable custom packaging.',
    allowIndex: true,
    allowFollow: true,
    sections: [],
  },
}

async function existsById(id) {
  const row = await client.fetch(
    `*[_id == $id || _id == "drafts." + $id][0]{_id}`,
    {id},
  )
  return Boolean(row?._id)
}

async function existsSustainability() {
  const byId = await existsById(SUSTAINABILITY.id)
  if (byId) return true
  const bySlug = await client.fetch(
    `*[_type == "contentPage" && slug.current == $slug][0]{_id}`,
    {slug: SUSTAINABILITY.slug},
  )
  return Boolean(bySlug?._id)
}

async function seed() {
  console.log(`\n🌱  Static pages → ${DATASET} (${PROJECT_ID})\n`)

  const plans = []
  for (const target of PINNED) {
    const exists = await existsById(target.id)
    plans.push({
      label: target.id,
      route: target.route,
      action: exists ? 'SKIP' : 'CREATE',
      doc: target.doc,
    })
  }

  const sustainabilityExists = await existsSustainability()
  plans.push({
    label: SUSTAINABILITY.id,
    route: SUSTAINABILITY.route,
    action: sustainabilityExists ? 'SKIP' : 'CREATE',
    doc: SUSTAINABILITY.doc,
  })

  for (const plan of plans) {
    console.log(`  [${plan.action}] ${plan.label} → ${plan.route}`)
  }

  const toCreate = plans.filter((p) => p.action === 'CREATE')
  if (!apply) {
    console.log(
      `\nDry run on dataset=${DATASET} — would CREATE ${toCreate.length}, SKIP ${plans.length - toCreate.length}. Pass --confirm to write.\n`,
    )
    return
  }

  if (DATASET === 'production' && !args.yesProduction) {
    console.error('❌  Production writes need --yes-production.')
    process.exit(1)
  }

  if (toCreate.length === 0) {
    console.log(`\nNothing to do on dataset=${DATASET} — all targets already exist.\n`)
    return
  }

  const tx = client.transaction()
  for (const plan of toCreate) {
    tx.createIfNotExists(plan.doc)
  }
  await tx.commit()
  console.log(
    `\n✅  Created ${toCreate.length} stub(s) on dataset=${DATASET}. Publish is not needed — docs are written as published ids. Fill copy in Studio before launch.\n`,
  )
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
