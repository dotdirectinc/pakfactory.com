#!/usr/bin/env node
/**
 * Seed the launch footer columns onto the `websiteNavigation` singleton.
 *
 * Rewrites only `columns` (up to 3). Leaves items, cta, utility, socialLinks,
 * aiAnswerLinks and legal untouched. Reuses existing footer link objects by
 * label so blog / account destinations stay exactly as today. Creates Terms of
 * Service as a site path when missing. Bundles is behind `--include-bundles`.
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

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:website-footer -- --dataset <development|production> [--confirm] [--yes-production] [--include-bundles] [--restore <file>]

  --dataset          REQUIRED. Which dataset to read/write. No env fallback.
  --confirm          Actually write. Without it the run is a dry run.
  --yes-production   Second gate; required to write to production.
  --include-bundles  Include Bundles under Products (owner decision pending).
  --restore <file>   Restore columns from a backup JSON written by this script.`

const args = parseScriptArgs({
  flags: ['include-bundles'],
  values: ['restore'],
  usage: USAGE,
})
const {confirm: apply, includeBundles, restore: restorePath} = args
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

/** Label aliases used when looking up an existing link to reuse. */
const LABEL_ALIASES = {
  Customizations: ['Customization'],
  Compatibility: ['Product Capability'],
}

/**
 * Launch footer shape. Paths document intent for new links and for preferring
 * an existing object whose relativePath matches. Reused links keep their own
 * linkType / destination fields.
 */
const LAUNCH_FOOTER = [
  {
    sections: [
      {
        title: 'Products',
        links: [
          {label: 'Products', relativePath: '/products'},
          {label: 'Customizations', relativePath: '/customizations'},
          {label: 'Compatibility', relativePath: '/customizations/compatibility'},
          {label: 'Bundles', relativePath: '/bundles', optionalBundles: true},
        ],
      },
      {
        title: 'Solutions',
        links: [
          {label: 'Solutions', relativePath: '/solutions'},
          {label: 'Expertise', relativePath: '/expertise'},
        ],
      },
      {
        title: 'Company',
        links: [
          {label: 'About', relativePath: '/about'},
          {label: 'Case Studies', relativePath: '/case-studies'},
          {label: 'Newsroom', relativePath: '/newsroom'},
        ],
      },
    ],
  },
  {
    sections: [
      {
        title: 'Academy',
        links: [
          {label: 'Packaging Type'},
          {label: 'Industry'},
          {label: 'Sustainability'},
        ],
      },
      {
        title: 'Blog',
        links: [{label: 'Blog'}, {label: 'Topics'}, {label: 'Contribute'}],
      },
    ],
  },
  {
    sections: [
      {
        title: 'Orders & Shipment',
        links: [
          {label: 'Account', relativePath: '/account'},
          {label: 'Account Requests', relativePath: '/account/requests'},
        ],
      },
      {
        title: 'Support',
        links: [
          {label: 'Request a Quote', relativePath: '/request/general'},
          {label: 'Contact', relativePath: '/contact'},
          {label: 'Help Center', relativePath: '/contact'},
        ],
      },
      {
        title: 'Legal',
        links: [
          {label: 'Privacy Policy', relativePath: '/policies/privacy-policy'},
          {label: 'Terms of Service', relativePath: '/policies/terms-of-service'},
          {label: 'Policies', relativePath: '/policies'},
        ],
      },
    ],
  },
]

function shortKey() {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

function trimLabel(value) {
  return typeof value === 'string' ? value.trim() : ''
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

function pickExistingLink(labelMap, label, preferredPath) {
  const candidates = []
  const exact = labelMap.get(label)
  if (exact) candidates.push(...exact)
  for (const alias of LABEL_ALIASES[label] ?? []) {
    const aliased = labelMap.get(alias)
    if (aliased) candidates.push(...aliased)
  }
  if (candidates.length === 0) return null
  if (preferredPath) {
    const byPath = candidates.find((link) => link.relativePath === preferredPath)
    if (byPath) return byPath
  }
  return candidates[0]
}

function reuseOrCreateLink(labelMap, spec, created, missing) {
  const existing = pickExistingLink(labelMap, spec.label, spec.relativePath)
  if (existing) {
    const next = {...existing, label: spec.label}
    if (trimLabel(existing.label) !== spec.label) {
      console.log(
        `  ↺  Relabel "${trimLabel(existing.label)}" → "${spec.label}" (kept ${linkTargetSummary(existing)})`,
      )
    }
    return next
  }

  if (!spec.relativePath) {
    missing.push(spec.label)
    console.log(`  ⚠  No existing link for "${spec.label}" and no relativePath to create one`)
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

function buildTargetColumns(currentColumns, {includeBundles}) {
  const labelMap = indexLinksByLabel(currentColumns)
  const created = []
  const missing = []

  const columns = LAUNCH_FOOTER.map((col) => ({
    _key: shortKey(),
    sections: col.sections.map((sec) => {
      const links = []
      for (const spec of sec.links) {
        if (spec.optionalBundles && !includeBundles) continue
        const link = reuseOrCreateLink(labelMap, spec, created, missing)
        if (link) links.push(link)
      }
      return {_key: shortKey(), title: sec.title, links}
    }),
  }))

  const targetLabels = new Set()
  for (const col of LAUNCH_FOOTER) {
    for (const sec of col.sections) {
      for (const spec of sec.links) {
        if (spec.optionalBundles && !includeBundles) continue
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
    `\n🌱  Website footer → dataset=${DATASET} (${PROJECT_ID}) · ${describeMode({confirm: apply, dataset: DATASET})}${includeBundles ? ' · include-bundles' : ''}${restorePath ? ` · restore=${restorePath}` : ''}\n`,
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
    const built = buildTargetColumns(currentColumns, {includeBundles})
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
