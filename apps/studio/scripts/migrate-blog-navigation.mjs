/**
 * Backfill `blogNavigation` from legacy `blogSettings.categoryOrder`, default footer columns,
 * and legacy footer href strings → reference-based links.
 *
 * From repo root:
 *   pnpm --filter @pakfactory/studio run migrate:blog-navigation
 *   pnpm --filter @pakfactory/studio run migrate:blog-navigation -- --dry-run
 *
 * Requires write token in repo root `.env.local` or `apps/blog/.env.local`.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildFooterLinkLookup,
  buildFooterNavigationSeed,
  footerNavigationHasLegacyLinks,
  migrateLegacyFooterNavigation,
} from './footer-navigation-seed-data.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/blog/.env.local'), override: true })

const dryRun = process.argv.includes('--dry-run')

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
  console.error('❌  Missing Sanity token in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
})

const WWW_BASE =
  process.env.NEXT_PUBLIC_WWW_URL?.replace(/\/$/, '') ||
  'https://www.pakfactory.com'

const BLOG_BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'http://localhost:3003'

const NAV_QUERY = /* groq */ `{
  "navigation": *[_id == "blogNavigation"][0]{
    _id,
    "categoryCount": count(primaryNavigation.categories),
    "footerColumnCount": count(footerNavigation.columns),
    primaryNavigation,
    footerNavigation
  },
  "settings": *[_id == "blogSettings"][0]{
    _id,
    categoryOrder
  },
  "linkLookup": {
    "categories": *[_type == "blogCategory" && defined(slug.current)]{ _id, "slug": slug.current },
    "blogPages": *[_type == "blogPage" && defined(slug.current)]{ _id, "slug": slug.current },
    "wwwPages": *[_type == "page" && defined(slug.current)]{ _id, "slug": slug.current },
    "posts": *[_type == "post" && defined(slug.current)]{ _id, "slug": slug.current },
    "tags": *[_type == "blogTag" && defined(slug.current)]{ _id, "slug": slug.current },
    "authors": *[_type == "author" && defined(slug.current)]{ _id, "slug": slug.current },
    "solutions": *[_type == "solution" && defined(slug.current)]{ _id, "slug": slug.current },
    "caseStudies": *[_type == "caseStudy" && defined(slug.current)]{ _id, "slug": slug.current }
  }
}`

async function migrate() {
  console.log(`\n🧭  Blog navigation migration → ${DATASET} (${PROJECT_ID})${dryRun ? ' [dry-run]' : ''}\n`)

  const { navigation, settings, linkLookup } = await client.fetch(NAV_QUERY)

  const navExists = Boolean(navigation?._id)
  const navCategoryCount = navigation?.categoryCount ?? 0
  const footerColumnCount = navigation?.footerColumnCount ?? 0
  const legacyOrder = settings?.categoryOrder ?? []

  const needsPrimary = navCategoryCount === 0 && legacyOrder.length > 0
  const needsFooterSeed = footerColumnCount === 0
  const needsFooterMigration =
    !needsFooterSeed && footerNavigationHasLegacyLinks(navigation?.footerNavigation)

  if (!needsPrimary && !needsFooterSeed && !needsFooterMigration) {
    console.log('  ✓  blogNavigation primary and footer links already up to date — nothing to do')
    return
  }

  if (needsPrimary) {
    console.log(
      `  →  Backfill primary nav with ${legacyOrder.length} categor${legacyOrder.length === 1 ? 'y' : 'ies'} from blogSettings.categoryOrder`,
    )
  } else if (navCategoryCount > 0) {
    console.log(`  ✓  Primary nav already has ${navCategoryCount} categor${navCategoryCount === 1 ? 'y' : 'ies'}`)
  } else {
    console.log('  ⚠  No primary nav categories on blogNavigation or legacy blogSettings.categoryOrder')
    console.log('     Configure Studio → Navigation → Primary Navigation, or run pnpm seed:blog-dev')
  }

  if (needsFooterSeed) {
    console.log('  →  Backfill footer link columns from default site footer structure')
  } else if (needsFooterMigration) {
    console.log('  →  Convert legacy footer href strings to reference-based links')
  } else {
    console.log(`  ✓  Footer already has ${footerColumnCount} column${footerColumnCount === 1 ? '' : 's'}`)
  }

  let footerNavigation = navigation?.footerNavigation ?? { columns: [] }

  if (needsFooterSeed) {
    footerNavigation = buildFooterNavigationSeed(WWW_BASE, BLOG_BASE)
  } else if (needsFooterMigration) {
    const lookup = buildFooterLinkLookup(linkLookup)
    const result = migrateLegacyFooterNavigation(
      footerNavigation,
      lookup,
      WWW_BASE,
      BLOG_BASE,
    )
    footerNavigation = result.footerNavigation
  }

  const doc = {
    _id: 'blogNavigation',
    _type: 'blogNavigation',
    primaryNavigation: needsPrimary
      ? { categories: legacyOrder }
      : navigation?.primaryNavigation ?? { categories: [] },
    footerNavigation,
  }

  if (dryRun) {
    console.log('\n✅  Dry run complete — no documents written\n')
    return
  }

  await client.createOrReplace(doc)
  console.log(
    `\n✅  blogNavigation ${navExists ? 'updated' : 'created'}. Refresh Studio and the blog header/footer.\n`,
  )
}

migrate().catch((err) => {
  console.error('❌  Blog navigation migration failed:', err.message)
  process.exit(1)
})
