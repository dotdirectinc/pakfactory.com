/**
 * Seed websiteNavigation singleton — header mega-menu (Products / Solutions)
 * plus footer chrome.
 *
 * Primary items:
 * - Products → Mega-menu group "Product Line" (path links from productLine docs)
 * - Solutions → groups by solutionType (internal refs to hasPage solutions)
 * - Customization / Expertise → flat hub path links
 * - Promo optional on every item; Solutions gets a heading+path promo (image in Studio)
 * - Footer CTA optional (Products / Solutions: “See all …”)
 *
 * From repo root (humans only — agents must not run; AGENTS.md guardrails):
 *   pnpm seed:website-navigation -- --dataset development
 *   pnpm seed:website-navigation -- --dataset development --confirm
 *   pnpm seed:website-navigation -- --dataset production --confirm --yes-production
 *
 * `--dataset` is required always (no env fallback). Without `--confirm` the run is a dry run.
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
loadEnv({path: join(repoRoot, 'apps/blog/.env.local'), override: true})

const USAGE = `Usage:
  pnpm seed:website-navigation -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({usage: USAGE})
const {confirm: apply, dataset: DATASET} = args

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local or apps/blog/.env.local')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error(
    '❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN).',
  )
  process.exit(1)
}

/** Prefer production origins so seeded hrefs strip cleanly via getWwwUrl() at runtime. */
function resolvePublicOrigin(candidates, fallback) {
  for (const raw of candidates) {
    const value = (raw || '').trim().replace(/\/+$/, '')
    if (!value) continue
    if (/localhost|127\.0\.0\.1/i.test(value)) continue
    return value
  }
  return fallback
}

const WWW_BASE = resolvePublicOrigin(
  [
    process.env.WEBSITE_NAV_SEED_WWW_URL,
    process.env.NEXT_PUBLIC_WWW_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ],
  'https://pakfactory.com',
)

const BLOG_BASE = resolvePublicOrigin(
  [process.env.WEBSITE_NAV_SEED_BLOG_URL, process.env.NEXT_PUBLIC_BLOG_URL],
  'https://pakfactory.com/blog',
)

const key = () => Math.random().toString(36).slice(2, 10)

function externalLink(url, label) {
  return {
    _key: key(),
    label,
    linkType: 'external',
    externalUrl: url,
  }
}

function pathLink(label, relativePath) {
  return {
    _key: key(),
    label,
    linkType: 'path',
    relativePath,
  }
}

function internalLink(label, documentId) {
  return {
    _key: key(),
    label,
    linkType: 'internal',
    internalLink: {_type: 'reference', _ref: documentId},
  }
}

function footerSection(title, links) {
  return {_key: key(), title, links}
}

function footerColumn(sections) {
  return {_key: key(), sections}
}

const AI_PROMPT = encodeURIComponent(
  'What is PakFactory (pakfactory.com)? Summarize what they do, who they serve, and cite your sources.',
)

const SOLUTION_GROUP_META = [
  {
    type: 'industry',
    label: 'By Industry',
  },
  {
    type: 'channel',
    label: 'By Channel',
  },
  {
    type: 'focus',
    label: 'By Focus',
  },
  {
    type: 'use-case',
    label: 'By Use Case',
  },
]

/**
 * @param {object} [catalog]
 * @param {{_id: string, title?: string, shortName?: string, slug?: string}[]} [catalog.productLines]
 * @param {{_id: string, title?: string, shortName?: string, slug?: string, solutionType?: string}[]} [catalog.solutions]
 */
export function buildWebsiteNavigationSeed(
  wwwBase = WWW_BASE,
  blogBase = BLOG_BASE,
  catalog = {productLines: [], solutions: []},
) {
  const w = (path) =>
    `${wwwBase.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const b = (path = '') => {
    const base = blogBase.replace(/\/+$/, '')
    if (!path) return base
    return `${base}${path.startsWith('/') ? path : `/${path}`}`
  }

  const productLines = catalog.productLines ?? []
  const solutions = catalog.solutions ?? []

  const productLineLinks = productLines
    .filter((line) => line.slug)
    .map((line) => {
      const label = (line.shortName || line.title || line.slug).trim()
      return pathLink(label, `/products/${line.slug}`)
    })

  const productsItem = {
    _key: key(),
    label: 'Products',
    groups: [
      {
        _key: key(),
        label: 'Product Line',
        items:
          productLineLinks.length > 0
            ? productLineLinks
            : [pathLink('All products', '/products')],
      },
    ],
    footerCta: {
      label: 'See all products',
      linkType: 'path',
      relativePath: '/products',
    },
  }

  const solutionGroups = []
  for (const meta of SOLUTION_GROUP_META) {
    const links = solutions
      .filter((s) => s.solutionType === meta.type && s._id)
      .map((s) => {
        const label = (s.shortName || s.title || s.slug || s._id).trim()
        return internalLink(label, s._id)
      })
    if (links.length === 0) continue
    solutionGroups.push({
      _key: key(),
      label: meta.label,
      items: links,
    })
  }

  const solutionsItem = {
    _key: key(),
    label: 'Solutions',
    groups:
      solutionGroups.length > 0
        ? solutionGroups
        : [
            {
              _key: key(),
              label: 'Solutions',
              items: [pathLink('All solutions', '/solutions')],
            },
          ],
    promo: {
      heading: 'Featured',
      link: {
        linkType: 'path',
        relativePath: '/solutions',
      },
    },
    footerCta: {
      label: 'See all solutions',
      linkType: 'path',
      relativePath: '/solutions',
    },
  }

  function flatHubItem(label, relativePath) {
    return {
      _key: key(),
      label,
      groups: [
        {
          _key: key(),
          label,
          items: [pathLink(label, relativePath)],
        },
      ],
    }
  }

  return {
    _id: 'websiteNavigation',
    _type: 'websiteNavigation',
    cta: {
      label: 'Get a Quote',
      linkType: 'path',
      relativePath: '/request/general',
    },
    items: [
      productsItem,
      flatHubItem('Customization', '/customizations'),
      solutionsItem,
      flatHubItem('Expertise', '/expertise'),
    ],
    columns: [
      footerColumn([
        footerSection('Product', [
          externalLink(w('/products'), 'Products'),
          externalLink(w('/about'), 'About'),
          externalLink(w('/contact'), 'Contact'),
          externalLink(w('/policies/privacy-policy'), 'Privacy Policy'),
          externalLink(w('/case-studies'), 'Case Studies'),
        ]),
        footerSection('Solutions', [
          externalLink(w('/solutions'), 'Solutions'),
          externalLink(w('/contact'), 'Contact'),
        ]),
        footerSection('Expertise', [
          externalLink(w('/expertise'), 'Expertise'),
        ]),
      ]),
      footerColumn([
        footerSection('Customizations', [
          externalLink(w('/customizations'), 'Customization'),
          externalLink(w('/bundles'), 'Bundles'),
          externalLink(w('/request/general'), 'Request a Quote'),
        ]),
        footerSection('Blog', [
          externalLink(b(), 'Blog'),
          externalLink(b('/contribute'), 'Contribute'),
          externalLink(b('/topics'), 'Topics'),
        ]),
        footerSection('Orders & Shipment', [
          externalLink(w('/account'), 'Account'),
          externalLink(w('/account/requests'), 'Account Requests'),
        ]),
      ]),
      footerColumn([
        footerSection('Academy', [
          externalLink(b('/topics?group=packaging-type'), 'Packaging Type'),
          externalLink(b('/topics?group=industry'), 'Industry'),
          externalLink(b('/sustainability'), 'Sustainability'),
        ]),
        footerSection('Resources', [
          externalLink(w('/case-studies'), 'Case Studies'),
          externalLink(w('/policies'), 'Policies'),
        ]),
        footerSection('Support', [
          externalLink(w('/contact'), 'Contact'),
          externalLink(w('/contact'), 'Help Center'),
        ]),
      ]),
    ],
    socialLinks: [
      {_key: key(), platform: 'instagram', url: 'https://www.instagram.com/pakfactory'},
      {_key: key(), platform: 'facebook', url: 'https://www.facebook.com/pakfactory'},
      {_key: key(), platform: 'linkedin', url: 'https://www.linkedin.com/company/pakfactory'},
      {_key: key(), platform: 'youtube', url: 'https://www.youtube.com/@pakfactory'},
      {_key: key(), platform: 'pinterest', url: 'https://www.pinterest.com/pakfactory'},
    ],
    aiAnswerLinks: [
      {
        _key: key(),
        platform: 'chatgpt',
        url: `https://chatgpt.com/?q=${AI_PROMPT}`,
      },
      {
        _key: key(),
        platform: 'gemini',
        url: `https://gemini.google.com/app?q=${AI_PROMPT}`,
      },
      {
        _key: key(),
        platform: 'perplexity',
        url: `https://www.perplexity.ai/search?q=${AI_PROMPT}`,
      },
      {
        _key: key(),
        platform: 'claude',
        url: `https://claude.ai/new?q=${AI_PROMPT}`,
      },
      {
        _key: key(),
        platform: 'grok',
        url: `https://grok.com/?q=${AI_PROMPT}`,
      },
    ],
  }
}

async function fetchCatalog(client) {
  const [productLines, solutions] = await Promise.all([
    client.fetch(`*[
      _type == "productLine" &&
      defined(slug.current)
    ] | order(title asc) {
      _id,
      title,
      shortName,
      "slug": slug.current
    }`),
    client.fetch(`*[
      _type == "solution" &&
      hasPage == true &&
      defined(slug.current)
    ] | order(title asc) {
      _id,
      title,
      shortName,
      solutionType,
      "slug": slug.current
    }`),
  ])
  return {
    productLines: productLines ?? [],
    solutions: solutions ?? [],
  }
}

async function publishDocument(client, documentId) {
  try {
    await client.request({
      uri: `/data/actions/${DATASET}`,
      method: 'POST',
      body: {
        actions: [
          {
            actionType: 'sanity.action.document.publish',
            draftId: `drafts.${documentId}`,
            publishedId: documentId,
          },
        ],
      },
    })
    return true
  } catch (err) {
    console.warn(`  ⚠  Publish skipped for ${documentId}: ${err.message}`)
    return false
  }
}

async function seed() {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
    token: TOKEN || undefined,
    useCdn: false,
  })

  let catalog = {productLines: [], solutions: []}
  try {
    catalog = await fetchCatalog(client)
  } catch (err) {
    console.warn(`  ⚠  Catalog fetch failed: ${err.message}`)
  }

  const doc = buildWebsiteNavigationSeed(WWW_BASE, BLOG_BASE, catalog)

  const productsGroup = doc.items.find((i) => i.label === 'Products')?.groups?.[0]
  const solutionsItem = doc.items.find((i) => i.label === 'Solutions')
  const solutionsByType = Object.fromEntries(
    (solutionsItem?.groups ?? []).map((g) => [g.label, g.items?.length ?? 0]),
  )

  console.log(
    `\n🌱  Website navigation seed → ${DATASET} (${PROJECT_ID}) [${describeMode({confirm: apply, dataset: DATASET})}]\n`,
  )
  console.log(`  www base : ${WWW_BASE}`)
  console.log(`  blog base: ${BLOG_BASE}`)
  console.log(`  product lines (seeded): ${productsGroup?.items?.length ?? 0}`)
  console.log(`  solutions by group   : ${JSON.stringify(solutionsByType)}`)
  console.log(`  items    : ${doc.items.length}`)
  console.log(`  columns  : ${doc.columns.length}`)
  console.log(`  social   : ${doc.socialLinks.length}`)
  console.log(`  ai links : ${doc.aiAnswerLinks.length}`)

  if (!apply) {
    console.log('\n--- document preview ---\n')
    console.log(JSON.stringify(doc, null, 2))
    console.log(
      `\n✅  Dry run complete for dataset=${DATASET} (no writes). Pass --confirm to write.\n`,
    )
    return
  }

  await client.createOrReplace(doc)
  await publishDocument(client, 'websiteNavigation')

  const verify = await client.fetch(
    `*[_id == "websiteNavigation"][0]{
      _id,
      "itemCount": count(items),
      "columnCount": count(columns),
      "socialCount": count(socialLinks),
      "aiCount": count(aiAnswerLinks),
      cta,
      "productsGroups": count(items[label == "Products"][0].groups),
      "solutionsGroups": count(items[label == "Solutions"][0].groups)
    }`,
  )

  console.log(`  ✓  _id         : ${verify?._id}`)
  console.log(`  ✓  items       : ${verify?.itemCount ?? 0}`)
  console.log(`  ✓  products groups : ${verify?.productsGroups ?? 0}`)
  console.log(`  ✓  solutions groups: ${verify?.solutionsGroups ?? 0}`)
  console.log(`  ✓  columns     : ${verify?.columnCount ?? 0}`)
  console.log(`  ✓  socialLinks : ${verify?.socialCount ?? 0}`)
  console.log(`  ✓  aiAnswerLinks: ${verify?.aiCount ?? 0}`)
  console.log(`  ✓  cta         : ${verify?.cta?.label ?? '(none)'}`)
  console.log(
    `\n✅  websiteNavigation seeded on ${DATASET}. Confirm in Studio → Navigation; attach Solutions promo image if needed, then refresh www.\n`,
  )
}

seed().catch((err) => {
  console.error('❌  Website navigation seed failed:', err.message)
  process.exit(1)
})
