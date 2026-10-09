#!/usr/bin/env node
/**
 * Seed a Materials “[TEST] Controller Lab” type + options so every Customer
 * control can be exercised on the test product (development QA for property
 * controllers). Titles are prefixed with `[TEST]` so mock data is easy to spot
 * in Studio (slugs / ids stay stable).
 *
 * Creates ONLY lab documents (fixed ids). References Materials category (never
 * patches it). Appends lab options onto the test product only — never mutates
 * other catalog types, properties, values, options, or products.
 *
 * Idempotent: createOrReplace lab ids; product append is no-op when already wired.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:controller-lab -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:controller-lab -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:controller-lab -- --dataset production --confirm --yes-production
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseScriptArgs, describeMode} from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:controller-lab -- --dataset <development|production> [--confirm] [--yes-production]

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

// ─── Stable ids (write allowlist) ────────────────────────────────────────────

const MATERIALS_CATEGORY_ID = 'cat-material-r2304'
const TYPE_ID = 'type-controller-lab'
const PRODUCT_ID = 'product.test-custom-3-tier-drawer-rigid-box'
/** Studio / list label prefix — not part of slug or _id. */
const TEST_PREFIX = '[TEST] '

function testTitle(title) {
  return title.startsWith(TEST_PREFIX) ? title : `${TEST_PREFIX}${title}`
}

const OPT_ALPHA = 'opt-controller-lab-alpha'
const OPT_BETA = 'opt-controller-lab-beta'
const OPT_GAMMA = 'opt-controller-lab-gamma'
const OPTION_IDS = [OPT_ALPHA, OPT_BETA, OPT_GAMMA]

/** @typedef {{ id: string, title: string, slug: string, control: string, valuesPerItem?: 'one' | 'many' }} LabProp */

/** @type {LabProp[]} */
const LAB_PROPS = [
  {id: 'prop-lab-chips', title: 'Lab Chips', slug: 'lab-chips', control: 'chip', valuesPerItem: 'one'},
  {
    id: 'prop-lab-chips-several',
    title: 'Lab Chips several',
    slug: 'lab-chips-several',
    control: 'chip',
    valuesPerItem: 'many',
  },
  {id: 'prop-lab-swatch', title: 'Lab Swatch', slug: 'lab-swatch', control: 'swatch'},
  {
    id: 'prop-lab-swatch-shades',
    title: 'Lab Swatch shades',
    slug: 'lab-swatch-shades',
    control: 'swatchShades',
  },
  {id: 'prop-lab-radio', title: 'Lab Radio', slug: 'lab-radio', control: 'radio'},
  {
    id: 'prop-lab-radio-pick',
    title: 'Lab Radio pick',
    slug: 'lab-radio-pick',
    control: 'radioPick',
  },
  {id: 'prop-lab-list', title: 'Lab List', slug: 'lab-list', control: 'listbox', valuesPerItem: 'one'},
  {id: 'prop-lab-cards', title: 'Lab Cards', slug: 'lab-cards', control: 'card'},
  {
    id: 'prop-lab-toggles',
    title: 'Lab Toggles',
    slug: 'lab-toggles',
    control: 'toggles',
    valuesPerItem: 'many',
  },
  {id: 'prop-lab-readonly', title: 'Lab Read-only', slug: 'lab-readonly', control: 'readonly'},
  {
    id: 'prop-lab-spec-table',
    title: 'Lab Spec table',
    slug: 'lab-spec-table',
    control: 'specTable',
  },
  {id: 'prop-lab-pantone', title: 'Lab Pantone', slug: 'lab-pantone', control: 'pantone'},
  {
    id: 'prop-lab-dimensions',
    title: 'Lab Dimensions',
    slug: 'lab-dimensions',
    control: 'dimension',
  },
]

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   slug: string,
 *   propertyId: string,
 *   kindOfId?: string,
 *   facts?: object[],
 * }} LabValue
 */

/** @type {LabValue[]} */
const LAB_VALUES = [
  // Chips (one)
  {id: 'pv-lab-chips-alpha', title: 'Alpha', slug: 'alpha', propertyId: 'prop-lab-chips'},
  {id: 'pv-lab-chips-bravo', title: 'Bravo', slug: 'bravo', propertyId: 'prop-lab-chips'},
  {id: 'pv-lab-chips-charlie', title: 'Charlie', slug: 'charlie', propertyId: 'prop-lab-chips'},
  // Chips (several)
  {id: 'pv-lab-chips-several-a', title: 'Option A', slug: 'option-a', propertyId: 'prop-lab-chips-several'},
  {id: 'pv-lab-chips-several-b', title: 'Option B', slug: 'option-b', propertyId: 'prop-lab-chips-several'},
  {id: 'pv-lab-chips-several-c', title: 'Option C', slug: 'option-c', propertyId: 'prop-lab-chips-several'},
  // Swatch — slugs match known swatch colors
  {id: 'pv-lab-swatch-white', title: 'White', slug: 'white', propertyId: 'prop-lab-swatch'},
  {id: 'pv-lab-swatch-black', title: 'Black', slug: 'black', propertyId: 'prop-lab-swatch'},
  {id: 'pv-lab-swatch-gold', title: 'Gold', slug: 'gold', propertyId: 'prop-lab-swatch'},
  {
    id: 'pv-lab-swatch-custom-color',
    title: 'Custom Color',
    slug: 'custom-color',
    propertyId: 'prop-lab-swatch',
  },
  // Swatch shades — bases then kinds
  {id: 'pv-lab-shade-red', title: 'Red', slug: 'red', propertyId: 'prop-lab-swatch-shades'},
  {id: 'pv-lab-shade-blue', title: 'Blue', slug: 'blue', propertyId: 'prop-lab-swatch-shades'},
  {
    id: 'pv-lab-shade-crimson',
    title: 'Crimson',
    slug: 'crimson',
    propertyId: 'prop-lab-swatch-shades',
    kindOfId: 'pv-lab-shade-red',
  },
  {
    id: 'pv-lab-shade-navy',
    title: 'Navy',
    slug: 'navy',
    propertyId: 'prop-lab-swatch-shades',
    kindOfId: 'pv-lab-shade-blue',
  },
  // Radio
  {id: 'pv-lab-radio-left', title: 'Left', slug: 'left', propertyId: 'prop-lab-radio'},
  {id: 'pv-lab-radio-center', title: 'Center', slug: 'center', propertyId: 'prop-lab-radio'},
  {id: 'pv-lab-radio-right', title: 'Right', slug: 'right', propertyId: 'prop-lab-radio'},
  // Radio pick — titles drive reveal heuristics
  {
    id: 'pv-lab-radio-pick-stock',
    title: 'Stock size',
    slug: 'stock-size',
    propertyId: 'prop-lab-radio-pick',
  },
  {
    id: 'pv-lab-radio-pick-custom',
    title: 'Custom size',
    slug: 'custom-size',
    propertyId: 'prop-lab-radio-pick',
  },
  // List
  {id: 'pv-lab-list-small', title: 'Small', slug: 'small', propertyId: 'prop-lab-list'},
  {id: 'pv-lab-list-medium', title: 'Medium', slug: 'medium', propertyId: 'prop-lab-list'},
  {id: 'pv-lab-list-large', title: 'Large', slug: 'large', propertyId: 'prop-lab-list'},
  // Cards
  {
    id: 'pv-lab-cards-standard',
    title: 'Standard',
    slug: 'standard',
    propertyId: 'prop-lab-cards',
    facts: [
      {_type: 'factText', _key: 'ft-std', label: 'commonlyUsedFor', text: 'Everyday use'},
    ],
  },
  {
    id: 'pv-lab-cards-premium',
    title: 'Premium',
    slug: 'premium',
    propertyId: 'prop-lab-cards',
    facts: [
      {_type: 'factText', _key: 'ft-prem', label: 'commonlyUsedFor', text: 'Gift presentation'},
    ],
  },
  {
    id: 'pv-lab-cards-economy',
    title: 'Economy',
    slug: 'economy',
    propertyId: 'prop-lab-cards',
    facts: [
      {_type: 'factText', _key: 'ft-eco', label: 'commonlyUsedFor', text: 'High volume'},
    ],
  },
  // Toggles
  {id: 'pv-lab-toggles-foil', title: 'Foil', slug: 'foil', propertyId: 'prop-lab-toggles'},
  {id: 'pv-lab-toggles-emboss', title: 'Emboss', slug: 'emboss', propertyId: 'prop-lab-toggles'},
  {id: 'pv-lab-toggles-spot-uv', title: 'Spot UV', slug: 'spot-uv', propertyId: 'prop-lab-toggles'},
  // Read-only
  {
    id: 'pv-lab-readonly-fixed',
    title: 'Factory standard',
    slug: 'factory-standard',
    propertyId: 'prop-lab-readonly',
  },
  // Spec table
  {
    id: 'pv-lab-spec-a',
    title: 'Grade A',
    slug: 'grade-a',
    propertyId: 'prop-lab-spec-table',
    facts: [
      {_type: 'factNumber', _key: 'fn-a-cal', label: 'caliper', value: 18},
      {_type: 'factNumber', _key: 'fn-a-th', label: 'thickness', value: 2},
    ],
  },
  {
    id: 'pv-lab-spec-b',
    title: 'Grade B',
    slug: 'grade-b',
    propertyId: 'prop-lab-spec-table',
    facts: [
      {_type: 'factNumber', _key: 'fn-b-cal', label: 'caliper', value: 24},
      {_type: 'factNumber', _key: 'fn-b-th', label: 'thickness', value: 2.5},
    ],
  },
  {
    id: 'pv-lab-spec-c',
    title: 'Grade C',
    slug: 'grade-c',
    propertyId: 'prop-lab-spec-table',
    facts: [
      {_type: 'factNumber', _key: 'fn-c-cal', label: 'caliper', value: 28},
      {_type: 'factNumber', _key: 'fn-c-th', label: 'thickness', value: 3},
    ],
  },
]

const LAB_VALUE_IDS = LAB_VALUES.map((v) => v.id)
const LAB_PROP_IDS = LAB_PROPS.map((p) => p.id)

/** Every document id this script may createOrReplace or patch (besides PRODUCT_ID). */
const LAB_DOC_IDS = new Set([TYPE_ID, ...LAB_PROP_IDS, ...LAB_VALUE_IDS, ...OPTION_IDS])

const ALLOWED_WRITE_IDS = new Set([...LAB_DOC_IDS, PRODUCT_ID])

function assertWritable(id) {
  if (!ALLOWED_WRITE_IDS.has(id)) {
    throw new Error(
      `Write guardrail: refusing to touch "${id}". Only lab docs + ${PRODUCT_ID} are allowed.`,
    )
  }
}

function slug(current) {
  return {_type: 'slug', current}
}

function propRef(id) {
  return {_type: 'reference', _ref: id}
}

function valueRef(id, key) {
  return {_type: 'reference', _ref: id, _key: key}
}

function propertyDoc(p) {
  return {
    _id: p.id,
    _type: 'property',
    title: testTitle(p.title),
    slug: slug(p.slug),
    description: `[TEST] Controller Lab QA — ${p.control} control.`,
  }
}

function valueDoc(v) {
  const doc = {
    _id: v.id,
    _type: 'propertyValue',
    title: testTitle(v.title),
    slug: slug(v.slug),
    property: propRef(v.propertyId),
  }
  if (v.kindOfId) {
    doc.kindOf = {_type: 'reference', _ref: v.kindOfId}
  }
  if (v.facts?.length) {
    doc.facts = v.facts
  }
  return doc
}

function declaredRows() {
  return LAB_PROPS.map((p) => {
    const row = {
      _type: 'declaredProperty',
      _key: `dp-${p.slug}`,
      usage: 'selectable',
      showOnDetailPage: true,
      property: propRef(p.id),
      control: p.control,
    }
    if (p.valuesPerItem) {
      row.valuesPerItem = p.valuesPerItem
    }
    return row
  })
}

function typeDoc() {
  const title = testTitle('Controller Lab')
  return {
    _id: TYPE_ID,
    _type: 'customizationType',
    title,
    shortName: title,
    slug: slug('controller-lab'),
    status: 'active',
    category: {_type: 'reference', _ref: MATERIALS_CATEGORY_ID},
    customerSelects: 'one',
    availabilityDecidedBy: 'product',
    properties: declaredRows(),
  }
}

function optionDoc(id, title, slugCurrent, valueIds) {
  const fullTitle = testTitle(title)
  return {
    _id: id,
    _type: 'customizationOption',
    title: fullTitle,
    shortName: fullTitle.replace(/^\[TEST\] Controller Lab — /, '[TEST] '),
    slug: slug(slugCurrent),
    status: 'active',
    appearsIn: 'configurable-no-page',
    type: {_type: 'reference', _ref: TYPE_ID},
    properties: valueIds.map((vid) => valueRef(vid, `ref-${vid}`)),
  }
}

/** All selectable PVs (pantone / dimension have none). */
const ALL_VALUE_IDS = LAB_VALUE_IDS

/** Thin subset for Beta / Gamma so Materials shows multiple lab options. */
const THIN_VALUE_IDS = [
  'pv-lab-chips-alpha',
  'pv-lab-chips-bravo',
  'pv-lab-swatch-white',
  'pv-lab-swatch-black',
  'pv-lab-radio-left',
  'pv-lab-radio-center',
]

function optionDocs() {
  return [
    optionDoc(OPT_ALPHA, 'Controller Lab — Alpha', 'controller-lab-alpha', ALL_VALUE_IDS),
    optionDoc(OPT_BETA, 'Controller Lab — Beta', 'controller-lab-beta', THIN_VALUE_IDS),
    optionDoc(OPT_GAMMA, 'Controller Lab — Gamma', 'controller-lab-gamma', THIN_VALUE_IDS),
  ]
}

function productEntries(optionIds) {
  return optionIds.map((id) => ({
    _type: 'availableCustomization',
    _key: `ac-${id}`,
    customization: {_type: 'reference', _ref: id},
    preselected: false,
  }))
}

async function main() {
  console.log(
    `\nseed:controller-lab  project=${PROJECT_ID}  dataset=${DATASET}  ${describeMode(args)}\n`,
  )
  console.log(
    'Write allowlist: lab docs only + append on',
    PRODUCT_ID,
    '(Materials category is reference-only).\n',
  )

  const materials = await client.fetch(
    `*[_id == $id][0]{_id, title, "slug": slug.current}`,
    {id: MATERIALS_CATEGORY_ID},
  )
  if (!materials?._id) {
    console.error(
      `❌  Materials category ${MATERIALS_CATEGORY_ID} missing in ${DATASET}.`,
    )
    process.exit(1)
  }
  console.log(`Category (ref only): ${materials.title} (${materials._id})`)

  const product = await client.fetch(
    `*[_id == $id][0]{
      _id,
      title,
      "availableRefs": availableCustomizations[].customization._ref
    }`,
    {id: PRODUCT_ID},
  )
  if (!product?._id) {
    console.error(`❌  Test product ${PRODUCT_ID} missing in ${DATASET}.`)
    process.exit(1)
  }
  console.log(`Product (append only): ${product.title} (${product._id})`)

  const existingRefs = new Set(
    (product.availableRefs ?? []).map((r) => String(r).replace(/^drafts\./, '')),
  )
  const missingOptionIds = OPTION_IDS.filter((id) => !existingRefs.has(id))

  const props = LAB_PROPS.map(propertyDoc)
  // Bases before shades that reference them via kindOf
  const bases = LAB_VALUES.filter((v) => !v.kindOfId).map(valueDoc)
  const shades = LAB_VALUES.filter((v) => v.kindOfId).map(valueDoc)
  const type = typeDoc()
  const options = optionDocs()

  const labDocs = [...props, ...bases, ...shades, type, ...options]
  for (const doc of labDocs) assertWritable(doc._id)
  assertWritable(PRODUCT_ID)

  console.log(`\nWill createOrReplace ${labDocs.length} lab document(s):`)
  console.log(`  ${LAB_PROP_IDS.length} properties`)
  console.log(`  ${LAB_VALUE_IDS.length} property values`)
  console.log(`  1 type (${TYPE_ID})`)
  console.log(`  ${OPTION_IDS.length} options (${OPTION_IDS.join(', ')})`)
  if (missingOptionIds.length) {
    console.log(
      `\nProduct append: ${missingOptionIds.length} option(s) → availableCustomizations`,
    )
    for (const id of missingOptionIds) console.log(`  + ${id}`)
  } else {
    console.log('\nProduct append: already wired — no product write')
  }

  const writeCount = labDocs.length + (missingOptionIds.length ? 1 : 0)
  if (!apply) {
    console.log(
      `\n${writeCount} write group(s) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`,
    )
    return
  }

  // Properties → base values → shade values → type → options → product
  const tx = client.transaction()
  for (const doc of labDocs) {
    assertWritable(doc._id)
    tx.createOrReplace(doc)
  }
  if (missingOptionIds.length) {
    assertWritable(PRODUCT_ID)
    tx.patch(PRODUCT_ID, (p) =>
      p
        .setIfMissing({availableCustomizations: []})
        .append('availableCustomizations', productEntries(missingOptionIds)),
    )
  }

  await tx.commit({visibility: 'sync'})
  console.log(`\n✅  Applied [TEST] Controller Lab seed in ${DATASET}.`)
  console.log(
    `    Product: ${PRODUCT_ID} → Materials → [TEST] Controller Lab — Alpha (all controls)\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
