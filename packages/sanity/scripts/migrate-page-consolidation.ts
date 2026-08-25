/**
 * PROD-2292 — consolidate the standing pages onto the four shared types.
 *
 * Retypes the three deployed documents that hold content; the other old page
 * types (aboutPage, contactPage, termsOfService, solutionsSettings) have ZERO
 * documents, so there is nothing to migrate for them — their empty type defs are
 * removed in the follow-up schema PR.
 *
 * Verified on production 2026-08-19: 0 incoming references to any of these, so no
 * reference repointing is needed.
 *
 *   privacyPolicy      → legalPage   (new id `privacyPage`)    title · lastUpdated · body
 *   page-home          → homePage    (new id `homePage`)       title · meta
 *   caseStudiesPage    → listingPage (SAME id `caseStudiesPage`) title · meta · ogImage
 *
 * The new-id retypes (privacy, home) are create-then-delete — safe and idempotent.
 * caseStudiesPage keeps its id, and a document's `_type` is immutable, so it is a
 * delete-then-recreate at the same id (safe here: 0 refs). The source data is read
 * into memory first and the dropped presentation fields (heroEyebrow, detailCta,
 * related*, headline/subheadline) are printed so an editor can rebuild them as
 * sections.
 *
 * RUN ON `development` FIRST, verify in the Studio, then production. The schema PR
 * that removes the old types must be deployed AFTER this runs (else the docs
 * orphan). Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:page-consolidation --dataset development
 *   ... --confirm                                        # apply (dry-run is default)
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

type Doc = Record<string, unknown> & { _id: string; _type: string }

async function get(id: string): Promise<Doc | null> {
  return client.fetch<Doc | null>(`*[_id == $id][0]`, { id }, { perspective: 'raw' })
}

async function main() {
  console.log(`PROD-2292 page consolidation — ${projectId}/${dataset}, mode ${write ? 'WRITE' : 'DRY-RUN'}`)

  const [pp, ph, cs, legal, home, listing] = await Promise.all([
    get('privacyPolicy'),
    get('page-home'),
    get('caseStudiesPage'),
    get('privacyPage'),
    get('homePage'),
    get('caseStudiesPage'),
  ])

  const plan: string[] = []

  // 1) privacyPolicy → legalPage (privacyPage)
  if (pp && pp._type === 'privacyPolicy') {
    plan.push(`privacyPolicy → legalPage(privacyPage): title="Privacy Policy", lastUpdated, body(${Array.isArray(pp.body) ? pp.body.length : 0} blocks)`)
    if (write) {
      await client.createIfNotExists({ _id: 'privacyPage', _type: 'legalPage', title: 'Privacy Policy', lastUpdated: pp.lastUpdated, body: pp.body })
      await client.delete({ query: '*[_id in ["privacyPolicy","drafts.privacyPolicy"]]' })
    }
  } else if (legal) {
    plan.push('privacyPolicy → legalPage: already done (privacyPage exists).')
  }

  // 2) page-home → homePage
  if (ph && ph._type === 'page') {
    plan.push(`page-home → homePage: title, meta. ⚠️ rebuild as sections — headline="${ph.headline ?? ''}" · subheadline="${ph.subheadline ?? ''}"`)
    if (write) {
      await client.createIfNotExists({ _id: 'homePage', _type: 'homePage', title: ph.title ?? 'Home Page', metaTitle: ph.metaTitle, metaDescription: ph.metaDescription })
      await client.delete({ query: '*[_id in ["page-home","drafts.page-home"]]' })
    }
  } else if (home) {
    plan.push('page-home → homePage: already done (homePage exists).')
  }

  // 3) caseStudiesPage → listingPage (SAME id) — delete then recreate (immutable _type)
  if (cs && cs._type === 'caseStudiesPage') {
    plan.push(`caseStudiesPage → listingPage (same id): title, meta, ogImage. ⚠️ rebuild as sections — heroEyebrow="${cs.heroEyebrow ?? ''}" · detailCta=${JSON.stringify(cs.detailCta ?? {})} · related="${cs.relatedSectionHeading ?? ''}"`)
    if (write) {
      await client.delete({ query: '*[_id in ["caseStudiesPage","drafts.caseStudiesPage"]]' })
      await client.create({ _id: 'caseStudiesPage', _type: 'listingPage', title: cs.title ?? 'Case Studies', metaTitle: cs.metaTitle, metaDescription: cs.metaDescription, ogImage: cs.ogImage })
    }
  } else if (listing && listing._type === 'listingPage') {
    plan.push('caseStudiesPage → listingPage: already done.')
  }

  console.log('')
  if (plan.length === 0) {
    console.log('✓ Nothing to migrate — all three already consolidated.')
    return
  }
  for (const line of plan) console.log(`  ${line}`)
  console.log('')
  console.log(write ? '✓ Done. Now deploy the schema PR that removes the old types.' : 'DRY-RUN — re-run with --confirm to apply.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
