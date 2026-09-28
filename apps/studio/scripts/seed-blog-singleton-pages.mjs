/**
 * Seed blog home, topics, 404, search, and contribute singleton page builders
 * (no posts, nav, or industries).
 *
 * From repo root:
 *   pnpm --filter @pakfactory/studio run seed:blog-singleton-pages -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:blog-singleton-pages -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:blog-singleton-pages -- --dataset production --confirm --yes-production
 *
 * Humans only — agents must not run this script (AGENTS.md Sanity content guardrails).
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, 'apps/blog/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:blog-singleton-pages -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local or apps/blog/.env.local')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
})

const ref = (id) => ({ _type: 'reference', _ref: id, _key: id })
const key = () => Math.random().toString(36).slice(2, 10)

/** Home layout without post refs — category rows + newsletter only. */
const blogHomePageDoc = {
  _id: 'blogHomePage',
  _type: 'blogPage',
  pageRole: 'home',
  language: 'en',
  title: 'Blog Homepage',
  srHeading: 'PakFactory Blog — Packaging Insights, Trends & Industry News',
  pageBuilder: [
    {
      _key: key(),
      _type: 'postCategoryRow',
      category: ref('bcat-packaging-news'),
      postsCount: 3,
    },
    {
      _key: key(),
      _type: 'postCategoryRow',
      category: ref('bcat-trends'),
      postsCount: 3,
    },
    {
      _key: key(),
      _type: 'postCategoryRow',
      category: ref('bcat-business-strategy'),
      postsCount: 3,
    },
    {
      _key: key(),
      _type: 'postCategoryRow',
      category: ref('bcat-sustainability'),
      postsCount: 3,
    },
    {
      _key: key(),
      _type: 'postCategoryRow',
      category: ref('bcat-design-inspiration'),
      postsCount: 3,
    },
    {
      _key: key(),
      _type: 'ctaNewsletter',
      heading: 'Get the latest packaging digest',
      body: 'Subscribe now for latest packaging news, trends and more.',
    },
  ],
}

const blogTopicsPageDoc = {
  _id: 'blogTopicsPage',
  _type: 'blogPage',
  pageRole: 'topics',
  language: 'en',
  title: 'Explore topics',
  description:
    'Browse PakFactory blog topics across packaging materials, types, finishes, and industries.',
  metaTitle: 'Explore topics | PakFactory Blog',
  metaDescription:
    'Browse PakFactory blog topics across packaging materials, types, finishes, and industries.',
  pageBuilder: [
    {
      _key: key(),
      _type: 'postPopularRow',
      heading: 'Popular this month',
      postsCount: 3,
    },
    {
      _key: key(),
      _type: 'ctaNewsletter',
      heading: 'Get the latest packaging digest',
      body: 'Subscribe now for latest packaging news, trends and more.',
    },
  ],
  // Listed groups on /topics (publish prepends new blogTopicGroup refs automatically).
  topics: [ref('btgrp-packaging-type'), ref('btgrp-industry')],
}

const blogNotFoundPageDoc = {
  _id: 'blogNotFoundPage',
  _type: 'blogPage',
  pageRole: 'notFound',
  language: 'en',
  title: '404 Page',
  pageBuilder: [
    {
      _key: key(),
      _type: 'postPopularRow',
      heading: 'Popular this month',
      postsCount: 3,
    },
    {
      _key: key(),
      _type: 'ctaNewsletter',
      heading: 'Get the latest packaging digest',
      body: 'Subscribe now for latest packaging news, trends and more.',
    },
  ],
}

const blogSearchPageDoc = {
  _id: 'blogSearchPage',
  _type: 'blogPage',
  pageRole: 'search',
  language: 'en',
  title: 'Search page',
  pageBuilder: [
    {
      _key: key(),
      _type: 'postPopularRow',
      heading: 'Popular this month',
      postsCount: 3,
    },
    {
      _key: key(),
      _type: 'ctaNewsletter',
      heading: 'Get the latest packaging digest',
      body: 'Subscribe now for latest packaging news, trends and more.',
    },
  ],
}

const blogContributePageDoc = {
  _id: 'blogContributePage',
  _type: 'blogPage',
  pageRole: 'contribute',
  language: 'en',
  title: 'Contribute to Our Blog',
  metaTitle: 'Contribute to Our Blog | PakFactory Blog',
  metaDescription:
    'Write for the PakFactory blog. We publish guest articles for the people who specify, design, and source custom packaging — brand owners, designers, and packaging teams.',
  pageBuilder: [
    {
      _key: key(),
      _type: 'ctaNewsletter',
      heading: 'Get the latest packaging digest',
      body: 'Subscribe now for latest packaging news, trends and more.',
    },
  ],
}

async function seed() {
  console.log(
    `\n🌱  Blog singleton pages → ${DATASET} (${PROJECT_ID}) — home + topics + 404 + search + contribute\n`,
  )

  // Dry run is the default. This seed had no such mode: it `createOrReplace`d five
  // singletons the moment it was invoked, against whatever dataset the ambient env
  // happened to name. Overwriting a live singleton is not recoverable by re-running.
  if (!args.confirm) {
    console.log(`  Would createOrReplace 5 singletons on dataset=${DATASET}:`)
    for (const d of [blogHomePageDoc, blogTopicsPageDoc, blogNotFoundPageDoc, blogSearchPageDoc, blogContributePageDoc]) {
      console.log(`    · ${d._id}`)
    }
    console.log(`\n  DRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`)
    return
  }

  const tx = client.transaction()
  tx.createOrReplace(blogHomePageDoc)
  tx.createOrReplace(blogTopicsPageDoc)
  tx.createOrReplace(blogNotFoundPageDoc)
  tx.createOrReplace(blogSearchPageDoc)
  tx.createOrReplace(blogContributePageDoc)
  await tx.commit()

  const [home, topics, notFound, search, contribute] = await Promise.all([
    client.fetch(
      '*[_id == "blogHomePage"][0]{ _id, title, "sections": count(pageBuilder) }',
    ),
    client.fetch(
      '*[_id == "blogTopicsPage"][0]{ _id, title, "sections": count(pageBuilder) }',
    ),
    client.fetch(
      '*[_id == "blogNotFoundPage"][0]{ _id, title, "sections": count(pageBuilder) }',
    ),
    client.fetch(
      '*[_id == "blogSearchPage"][0]{ _id, title, "sections": count(pageBuilder) }',
    ),
    client.fetch(
      '*[_id == "blogContributePage"][0]{ _id, title, "sections": count(pageBuilder) }',
    ),
  ])

  console.log(`  ✓  blogHomePage       : ${home?.sections ?? 0} sections`)
  console.log(`  ✓  blogTopicsPage     : ${topics?.sections ?? 0} sections`)
  console.log(`  ✓  blogNotFoundPage   : ${notFound?.sections ?? 0} sections`)
  console.log(`  ✓  blogSearchPage     : ${search?.sections ?? 0} sections`)
  console.log(`  ✓  blogContributePage : ${contribute?.sections ?? 0} sections`)
  console.log(
    '\n✅  Singleton page seed complete. Preview contribute at http://localhost:3003/contribute\n',
  )
}

seed().catch((err) => {
  console.error('❌  Singleton page seed failed:', err.message)
  process.exit(1)
})
