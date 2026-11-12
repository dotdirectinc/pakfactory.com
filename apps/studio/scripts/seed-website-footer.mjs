#!/usr/bin/env node
/**
 * Seed the launch footer columns onto the `websiteNavigation` singleton.
 *
 * Rewrites only `columns` (up to 3). Leaves items, cta, utility, socialLinks,
 * aiAnswerLinks and legal untouched.
 *
 * Sitemap packed left → right, then down (schema max 3 columns):
 *   Col 1: Products · Expertise · Account
 *   Col 2: Customization · Company · Others
 *   Col 3: Solutions · Resources
 *
 * Products are the four named lines (+ All Products), not every productLine.
 * Expertise omits Fulfillment. Careers + Blog are external URLs when created.
 *
 * Reuses existing footer link objects by label when the destination matches.
 * Creates missing links as site paths (or external when specified).
 *
 * Idempotent: a second run with the same input prints "Nothing to change".
 * Stops if a draft exists — publish or discard it in Studio first.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails). Dry run only:
 *
 *   pnpm --filter @pakfactory/studio run seed:website-footer -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:website-footer -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:website-footer -- --dataset production --confirm --yes-production
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {randomUUID} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describeMode, parseScriptArgs} from './lib/script-args.mjs'
import {stageRank} from './lib/finder-general-buckets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:website-footer -- --dataset <development|production> [--confirm] [--yes-production] [--restore <file>]

  --dataset          REQUIRED. Which dataset to read/write. No env fallback.
  --confirm          Actually write. Without it the run is a dry run.
  --yes-production   Second gate; required to write to production.
  --restore <file>   Restore columns from a backup JSON written by this script.`

const args = parseScriptArgs({
  values: ['restore'],
  usage: USAGE,
})
const {confirm: apply, restore: restorePath} = args
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

const DOC_ID = 'websiteNavigation'
const BACKUP_DIR = join(__dirname, 'backups')
const PUBLISHED = '!(_id in path("drafts.**"))'
const LINE_VISIBLE = '(!defined(status) || status == "active")'

const CAREERS_URL = 'https://career.pakfactory.com/'
const BLOG_URL = (
  process.env.NEXT_PUBLIC_BLOG_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://www.pakfactory.com'
).replace(/\/$/, '') + '/blog'

/** Sitemap product lines (label + slug/title hints). Not every productLine. */
const PRODUCT_LINE_SPECS = [
  {label: 'Rigid Boxes', slugHints: ['rigid-boxes'], titleHints: ['rigid boxes']},
  {label: 'Folding Cartons', slugHints: ['folding-cartons'], titleHints: ['folding cartons']},
  {
    label: 'Corrugated Boxes',
    slugHints: ['corrugated-boxes'],
    titleHints: ['corrugated boxes'],
  },
  {
    label: 'Flexible Pouches',
    slugHints: ['flexible-pouches', 'pouches'],
    titleHints: ['flexible pouches', 'pouches'],
  },
]

/** Sitemap expertise stages — omit Fulfillment and anything else. */
const EXPERTISE_SPECS = [
  {label: 'Packaging Strategy', titleHints: ['packaging strategy', 'strategy']},
  {label: 'Packaging Design', titleHints: ['packaging design', 'design']},
  {label: 'Prototyping', titleHints: ['prototyp']},
  {label: 'Managed Manufacturing', titleHints: ['managed manufacturing', 'manufactur']},
  {label: 'Logistics Management', titleHints: ['logistics management', 'logistic']},
]

/** Customization category tabs under /customizations/{slug}. */
const CUSTOMIZATION_CATEGORY_SPECS = [
  {label: 'Materials', slugHints: ['materials'], titleHints: ['materials']},
  {label: 'Finishing', slugHints: ['finishing', 'finishes'], titleHints: ['finishing', 'finishes']},
  {label: 'Printing', slugHints: ['printing'], titleHints: ['printing']},
  {
    label: 'Additional Customizations',
    slugHints: ['additional-customization', 'additional'],
    titleHints: ['additional customization', 'additional'],
  },
]

/** Solution grouping labels as in the sitemap diagram. */
const SOLUTION_GROUPING_LINKS = [
  {label: 'By Industry', relativePath: '/solutions'},
  {label: 'By Channel', relativePath: '/solutions'},
  {label: 'By Focus', relativePath: '/solutions'},
  {label: 'By Use Case', relativePath: '/solutions'},
]

/** Label aliases used when looking up an existing link to reuse (new → old). */
const LABEL_ALIASES = {
  'About Us': ['About'],
  'Contact Us': ['Contact'],
  'By Industry': ['Industry'],
  'By Channel': ['Channel'],
  'By Focus': ['Focus'],
  'By Use Case': ['Use Case'],
  'Your Request': ['Account Requests'],
  'All Products': ['Products'],
  'All Options': ['Customizations', 'Customization'],
  'All Solutions': ['Solutions'],
  'Additional Customizations': ['Additional Customization'],
  'Logistics Management': ['Logistics'],
  'Artwork Guideline': ['Artwork Guidelines'],
  'Dieline Templates': ['Dielines'],
}

const CANDIDATES_QUERY = /* groq */ `{
  "productLines": *[_type == "productLine" && ${PUBLISHED} && defined(slug.current) && ${LINE_VISIBLE}]
    | order(title asc){title, "slug": slug.current},
  "expertise": *[_type == "expertiseStage" && ${PUBLISHED} && defined(slug.current)
    && (!defined(status) || status in ["active", "coming-soon"])]
    {title, "slug": slug.current},
  "customizationCategories": *[_type == "customizationCategory" && ${PUBLISHED} && defined(slug.current)
    && (!defined(status) || status == "active")]
    | order(title asc){title, "slug": slug.current}
}`

function normalizeKey(value) {
  return trimLabel(value).toLowerCase()
}

/**
 * Resolve a catalog doc by preferred slug, then title hints.
 * @returns {{title: string, slug: string} | null}
 */
function resolveCatalogDoc(docs, {slugHints = [], titleHints = []}) {
  const list = docs ?? []
  for (const hint of slugHints) {
    const hit = list.find((d) => normalizeKey(d.slug) === normalizeKey(hint))
    if (hit) return hit
  }
  for (const hint of titleHints) {
    const exact = list.find((d) => normalizeKey(d.title) === normalizeKey(hint))
    if (exact) return exact
  }
  for (const hint of titleHints) {
    const partial = list.find((d) => normalizeKey(d.title).includes(normalizeKey(hint)))
    if (partial) return partial
  }
  return null
}

function requireResolved(kind, specs, docs) {
  const remaining = [...(docs ?? [])]
  const resolved = []
  const missing = []
  for (const spec of specs) {
    const doc = resolveCatalogDoc(remaining, spec)
    if (!doc) {
      missing.push(spec.label)
      continue
    }
    remaining.splice(remaining.indexOf(doc), 1)
    resolved.push({spec, doc})
  }
  if (missing.length) {
    const available = (docs ?? []).map((d) => `${d.title} (${d.slug})`).join(' · ') || '—'
    console.error(
      `✖  Missing ${kind} on dataset=${DATASET}: ${missing.join(', ')}\n` +
        `   Available: ${available}\n`,
    )
    process.exit(1)
  }
  return resolved
}

/**
 * Build the sitemap footer target (3 columns). Dataset supplies slugs for
 * product lines, expertise stages, and customization categories.
 */
function buildLaunchFooter({productLines, expertise, customizationCategories}) {
  const products = requireResolved('product lines', PRODUCT_LINE_SPECS, productLines)
  const stages = requireResolved('expertise stages', EXPERTISE_SPECS, expertise)
  const categories = requireResolved(
    'customization categories',
    CUSTOMIZATION_CATEGORY_SPECS,
    customizationCategories,
  )

  const productLinks = [
    {label: 'All Products', relativePath: '/products'},
    ...products.map(({spec, doc}) => ({
      label: spec.label,
      relativePath: `/products/${doc.slug}`,
    })),
  ]

  const expertiseLinks = [...stages]
    .sort((a, b) => stageRank(a.spec.label) - stageRank(b.spec.label))
    .map(({spec, doc}) => ({
      label: spec.label,
      relativePath: `/expertise/${doc.slug}`,
    }))

  const customizationLinks = [
    {label: 'All Options', relativePath: '/customizations'},
    ...categories.map(({spec, doc}) => ({
      label: spec.label,
      relativePath: `/customizations/${doc.slug}`,
    })),
  ]

  return [
    {
      sections: [
        {title: 'Products', links: productLinks},
        {title: 'Expertise', links: expertiseLinks},
        {
          title: 'Account',
          links: [
            {label: 'Your Request', relativePath: '/account/requests'},
            {label: 'Profile', relativePath: '/account/profile'},
          ],
        },
      ],
    },
    {
      sections: [
        {title: 'Customization', links: customizationLinks},
        {
          title: 'Company',
          links: [
            {label: 'About Us', relativePath: '/about'},
            {label: 'Sustainability', relativePath: '/sustainability'},
            {label: 'Newsroom', relativePath: '/newsroom'},
            {label: 'Careers', externalUrl: CAREERS_URL},
          ],
        },
        {
          title: 'Others',
          links: [
            {label: 'Terms of Service', relativePath: '/policies/terms-of-service'},
            {label: 'Privacy Policy', relativePath: '/policies/privacy-policy'},
            {label: 'Cookies Preference', relativePath: '/policies/cookies-preference'},
            {label: 'Sitemap', relativePath: '/sitemap'},
          ],
        },
      ],
    },
    {
      sections: [
        {
          title: 'Solutions',
          links: [
            {label: 'All Solutions', relativePath: '/solutions'},
            ...SOLUTION_GROUPING_LINKS,
          ],
        },
        {
          title: 'Resources',
          links: [
            {label: 'Glossary', relativePath: '/glossary'},
            {label: 'Artwork Guideline', relativePath: '/resources/artwork-guideline'},
            {label: 'Dieline Templates', relativePath: '/resources/dieline-templates'},
            {label: 'Blog', externalUrl: BLOG_URL, reuseAnyLabel: true},
            {label: 'Case Studies', relativePath: '/case-studies'},
            {label: 'FAQs', relativePath: '/faqs'},
            {label: 'Contact Us', relativePath: '/contact'},
          ],
        },
      ],
    },
  ]
}

function shortKey() {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

function trimLabel(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function pathFromExternalUrl(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/'
  } catch {
    return null
  }
}

function normalizeUrl(url) {
  return trimLabel(url).replace(/\/+$/, '')
}

function linkMatchesPreferredPath(link, preferredPath) {
  if (!preferredPath) return true
  if (link.relativePath === preferredPath) return true
  if (link.externalUrl) {
    const path = pathFromExternalUrl(link.externalUrl)
    return path === preferredPath
  }
  return false
}

function linkMatchesPreferred(link, preferred) {
  if (!preferred) return true
  if (preferred.relativePath) {
    return linkMatchesPreferredPath(link, preferred.relativePath)
  }
  if (preferred.externalUrl) {
    if (link.linkType !== 'external' || !link.externalUrl) return false
    return normalizeUrl(link.externalUrl) === normalizeUrl(preferred.externalUrl)
  }
  return true
}

function linkTargetSummary(link) {
  if (!link) return '—'
  if (link.linkType === 'path') return link.relativePath || '(empty path)'
  if (link.linkType === 'external') return link.externalUrl || '(empty url)'
  if (link.linkType === 'internal') {
    const ref = link.internalLink?._ref || link.internalLink
    return ref ? `ref:${ref}` : '(empty ref)'
  }
  if (link.relativePath) return link.relativePath
  if (link.externalUrl) return link.externalUrl
  return link.linkType || '—'
}

function flattenColumns(columns) {
  const rows = []
  ;(columns ?? []).forEach((col, colIdx) => {
    ;(col?.sections ?? []).forEach((sec) => {
      const title = trimLabel(sec?.title) || '(untitled)'
      ;(sec?.links ?? []).forEach((link) => {
        rows.push({
          column: colIdx + 1,
          section: title,
          label: trimLabel(link?.label) || '(no label)',
          target: linkTargetSummary(link),
          link,
        })
      })
    })
  })
  return rows
}

function printTable(title, columns) {
  console.log(`\n  ${title}`)
  console.log('  col | section              | label                 | target')
  console.log('  ----+----------------------+-----------------------+------------------------------')
  for (const row of flattenColumns(columns)) {
    const col = String(row.column).padStart(3)
    const section = row.section.padEnd(20).slice(0, 20)
    const label = row.label.padEnd(21).slice(0, 21)
    console.log(`  ${col} | ${section} | ${label} | ${row.target}`)
  }
}

/** Stable signature for idempotency — ignores _key on columns/sections/links. */
function columnsSignature(columns) {
  return JSON.stringify(
    (columns ?? []).map((col) =>
      (col?.sections ?? []).map((sec) => ({
        title: trimLabel(sec?.title),
        links: (sec?.links ?? []).map((link) => ({
          label: trimLabel(link?.label),
          linkType: link?.linkType ?? null,
          relativePath: link?.relativePath ?? null,
          externalUrl: link?.externalUrl ?? null,
          internalLink: link?.internalLink?._ref ?? link?.internalLink ?? null,
        })),
      })),
    ),
  )
}

function indexLinksByLabel(columns) {
  /** @type {Map<string, object[]>} */
  const map = new Map()
  for (const row of flattenColumns(columns)) {
    const label = trimLabel(row.link?.label)
    if (!label) continue
    const list = map.get(label) ?? []
    list.push(row.link)
    map.set(label, list)
  }
  return map
}

function pickExistingLink(labelMap, label, preferred) {
  const candidates = []
  const exact = labelMap.get(label)
  if (exact) candidates.push(...exact)
  for (const alias of LABEL_ALIASES[label] ?? []) {
    const aliased = labelMap.get(alias)
    if (aliased) candidates.push(...aliased)
  }
  if (candidates.length === 0) return null

  if (preferred) {
    // Do not reuse a same-label link that points somewhere else (e.g. Academy
    // "Industry" blog URL must not become Solutions "By Industry" → /solutions).
    return candidates.find((link) => linkMatchesPreferred(link, preferred)) ?? null
  }
  return candidates[0]
}

function reuseOrCreateLink(labelMap, spec, created, missing) {
  const preferred = spec.reuseAnyLabel
    ? null
    : spec.relativePath
      ? {relativePath: spec.relativePath}
      : spec.externalUrl
        ? {externalUrl: spec.externalUrl}
        : null

  const existing = pickExistingLink(labelMap, spec.label, preferred)
  if (existing) {
    const next = {...existing, label: spec.label}
    if (trimLabel(existing.label) !== spec.label) {
      console.log(
        `  ↺  Relabel "${trimLabel(existing.label)}" → "${spec.label}" (kept ${linkTargetSummary(existing)})`,
      )
    }
    return next
  }

  if (spec.externalUrl) {
    const createdLink = {
      _key: shortKey(),
      label: spec.label,
      linkType: 'external',
      externalUrl: spec.externalUrl,
    }
    created.push({label: spec.label, relativePath: spec.externalUrl})
    return createdLink
  }

  if (!spec.relativePath) {
    missing.push(spec.label)
    console.log(`  ⚠  No existing link for "${spec.label}" and no relativePath/externalUrl to create one`)
    return null
  }

  const createdLink = {
    _key: shortKey(),
    label: spec.label,
    linkType: 'path',
    relativePath: spec.relativePath,
  }
  created.push({label: spec.label, relativePath: spec.relativePath})
  return createdLink
}

function buildTargetColumns(currentColumns, launchFooter) {
  const labelMap = indexLinksByLabel(currentColumns)
  const created = []
  const missing = []

  const columns = launchFooter.map((col) => ({
    _key: shortKey(),
    sections: col.sections.map((sec) => {
      const links = []
      for (const spec of sec.links) {
        const link = reuseOrCreateLink(labelMap, spec, created, missing)
        if (link) links.push(link)
      }
      return {_key: shortKey(), title: sec.title, links}
    }),
  }))

  const targetLabels = new Set()
  for (const col of launchFooter) {
    for (const sec of col.sections) {
      for (const spec of sec.links) {
        targetLabels.add(spec.label)
        for (const alias of LABEL_ALIASES[spec.label] ?? []) {
          targetLabels.add(alias)
        }
      }
    }
  }

  const dropped = []
  for (const row of flattenColumns(currentColumns)) {
    const label = trimLabel(row.link?.label)
    if (!label) continue
    if (!targetLabels.has(label)) {
      dropped.push({
        column: row.column,
        section: row.section,
        label,
        target: row.target,
      })
    }
  }

  return {columns, created, missing, dropped}
}

async function writeBackup(columns) {
  await mkdir(BACKUP_DIR, {recursive: true})
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = join(BACKUP_DIR, `website-footer-${DATASET}-${stamp}.json`)
  const payload = {
    dataset: DATASET,
    documentId: DOC_ID,
    backedUpAt: new Date().toISOString(),
    columns,
  }
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return path
}

async function loadRestoreColumns(filePath) {
  const absolute = resolve(filePath)
  const raw = await readFile(absolute, 'utf8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data.columns)) {
    throw new Error(`Restore file has no columns array: ${absolute}`)
  }
  if (data.dataset && data.dataset !== DATASET) {
    throw new Error(
      `Restore file dataset=${data.dataset} does not match --dataset ${DATASET}`,
    )
  }
  return {path: absolute, columns: data.columns, meta: data}
}

async function seed() {
  console.log(
    `\n🌱  Website footer → dataset=${DATASET} (${PROJECT_ID}) · ${describeMode({confirm: apply, dataset: DATASET})}${restorePath ? ` · restore=${restorePath}` : ''}\n`,
  )

  const docs = await client.fetch(`*[_id in [$id, "drafts." + $id]]{_id, columns}`, {
    id: DOC_ID,
  })
  const published = docs.find((d) => d._id === DOC_ID)
  const draft = docs.find((d) => d._id === `drafts.${DOC_ID}`)

  if (draft) {
    console.error('✖  Publish or discard the draft in Studio first')
    console.error(`   Found ${draft._id} — refusing to overwrite open edits.\n`)
    process.exit(1)
  }
  if (!published) {
    console.error(`✖  No published ${DOC_ID} on dataset=${DATASET}. Create it in Studio first.\n`)
    process.exit(1)
  }

  const currentColumns = published.columns ?? []

  let nextColumns
  let created = []
  let missing = []
  let dropped = []

  if (restorePath) {
    const restored = await loadRestoreColumns(restorePath)
    nextColumns = restored.columns
    console.log(`  Restoring columns from ${restored.path}`)
  } else {
    const candidates = await client.fetch(CANDIDATES_QUERY)
    const productLines = candidates.productLines ?? []
    const expertise = candidates.expertise ?? []
    const customizationCategories = candidates.customizationCategories ?? []

    console.log('  Available on the dataset:')
    console.log(
      `    product lines (${productLines.length}): ${productLines.map((d) => d.title).join(' · ') || '—'}`,
    )
    console.log(
      `    customization categories (${customizationCategories.length}): ${
        customizationCategories.map((d) => d.title).join(' · ') || '—'
      }`,
    )
    console.log(
      `    expertise (${expertise.length}): ${
        [...expertise]
          .sort((a, b) => stageRank(a.title) - stageRank(b.title))
          .map((d) => d.title)
          .join(' · ') || '—'
      }`,
    )

    if (productLines.length === 0) {
      console.error(`✖  No visible product lines on dataset=${DATASET}. Refusing to seed an empty Products section.\n`)
      process.exit(1)
    }
    if (expertise.length === 0) {
      console.error(`✖  No expertise stages on dataset=${DATASET}. Refusing to seed an empty Expertise section.\n`)
      process.exit(1)
    }
    if (customizationCategories.length === 0) {
      console.error(
        `✖  No customization categories on dataset=${DATASET}. Refusing to seed an empty Customization section.\n`,
      )
      process.exit(1)
    }

    const launchFooter = buildLaunchFooter({
      productLines,
      expertise,
      customizationCategories,
    })
    const built = buildTargetColumns(currentColumns, launchFooter)
    nextColumns = built.columns
    created = built.created
    missing = built.missing
    dropped = built.dropped
  }

  printTable('BEFORE', currentColumns)
  printTable('AFTER', nextColumns)

  if (created.length) {
    console.log('\n  Created (new link objects):')
    for (const row of created) {
      console.log(`    + ${row.label} → ${row.relativePath}`)
    }
  } else if (!restorePath) {
    console.log('\n  Created: none (every target link reused an existing object)')
  }

  if (missing.length) {
    console.log('\n  Could not find by label (and no path to create):')
    for (const label of missing) console.log(`    ? ${label}`)
  }

  if (dropped.length) {
    console.log('\n  Current links not in the target (will drop):')
    for (const row of dropped) {
      console.log(`    − col ${row.column} / ${row.section} / ${row.label} → ${row.target}`)
    }
  } else if (!restorePath) {
    console.log('\n  Dropped: none')
  }

  if (columnsSignature(currentColumns) === columnsSignature(nextColumns)) {
    console.log(`\n  Nothing to change on dataset=${DATASET}.\n`)
    return
  }

  if (!apply) {
    console.log(`\n  DRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`)
    return
  }

  const backupPath = await writeBackup(currentColumns)
  console.log(`\n  Backup → ${backupPath}`)

  await client
    .transaction()
    .patch(DOC_ID, (p) => p.set({columns: nextColumns}))
    .commit({autoGenerateArrayKeys: false})

  console.log(`\n✅  Patched ${DOC_ID}.columns on dataset=${DATASET}.\n`)
}

seed().catch((err) => {
  console.error(`❌  Website footer seed failed on dataset=${DATASET}:`, err.message)
  process.exit(1)
})
