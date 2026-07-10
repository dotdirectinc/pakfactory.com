/**
 * Seed blog home, topics, 404, search, and contribute singleton page builders
 * (no posts, nav, or industries).
 *
 * From repo root:
 *   node apps/studio/scripts/seed-blog-singleton-pages.mjs
 *
 * Humans only — agents must not run this script (AGENTS.md Sanity content guardrails).
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, 'apps/blog/.env.local'), override: true })

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'development'
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
      _type: 'promoBanner',
      heading: 'Custom packaging, made simple',
      body: 'From concept to delivery, PakFactory helps you design, prototype, and produce packaging that stands out.',
      ctaLabel: 'Get started',
      ctaUrl: '/',
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
