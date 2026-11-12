#!/usr/bin/env node
/**
 * Replace the pinned Legal Page `cookiesPage` with a general Cookies Preference
 * template (prose — not a consent-manager UI). Route: /policies/cookies-preference.
 *
 * CREATE-OR-REPLACE on `cookiesPage`. The stub from seed-static-pages is
 * create-if-missing only and will not update an existing cookiesPage — this
 * script is what fills usable copy.
 *
 * Privacy Policy links use `/policies/privacy-policy`. Contact uses `/contact`.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:cookies-preference -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:cookies-preference -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:cookies-preference -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:cookies-preference -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.

  Replaces title, lastUpdated, SEO fields, and body on pinned id cookiesPage.`

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

const COOKIES_ID = 'cookiesPage'
const LAST_UPDATED = '2026-01-01'
const META_DESCRIPTION =
  'How PakFactory uses cookies and how you can manage your preferences in your browser.'

/** @typedef {{text: string, strong?: boolean, href?: string}} Span */

/** @type {{heading: string, parts: Array<{type: 'p'|'ul', spans?: Span[], items?: Span[][]}>}[]} */
const COOKIES_SECTIONS = [
  {
    heading: 'What are cookies?',
    parts: [
      {
        type: 'p',
        spans: [
          {
            text: 'Cookies are small text files that a website or its service provider stores on your device through your browser. They help the site recognize your browser, remember preferences, and understand how visitors use the site.',
          },
        ],
      },
    ],
  },
  {
    heading: 'How we use cookies',
    parts: [
      {
        type: 'p',
        spans: [
          {
            text: 'PakFactory may use cookies and similar technologies in these broad categories:',
          },
        ],
      },
      {
        type: 'ul',
        items: [
          [
            {text: 'Necessary', strong: true},
            {
              text: ' — required for basic site functions such as security, load balancing, remembering a signed-in session, or completing a quote request.',
            },
          ],
          [
            {text: 'Analytics', strong: true},
            {
              text: ' — help us understand traffic, page performance, and how people move through the site so we can improve it.',
            },
          ],
          [
            {text: 'Marketing', strong: true},
            {
              text: ' — may be used to measure campaigns or show more relevant messaging on PakFactory or partner sites, where applicable.',
            },
          ],
        ],
      },
      {
        type: 'p',
        spans: [
          {
            text: 'Exact tools and vendors can change over time. For how we handle personal information more broadly, see our ',
          },
          {text: 'Privacy Policy', href: '/policies/privacy-policy'},
          {text: '.'},
        ],
      },
    ],
  },
  {
    heading: 'Managing your preferences',
    parts: [
      {
        type: 'p',
        spans: [
          {
            text: 'You can control cookies through your browser settings. Most browsers let you block or delete cookies, warn you before a cookie is stored, or clear cookies for a specific site. Steps differ by browser — check the Help or Settings menu for Chrome, Safari, Edge, Firefox, or the browser you use.',
          },
        ],
      },
      {
        type: 'p',
        spans: [
          {
            text: 'If you turn cookies off, some features may not work as expected (for example, staying signed in or remembering progress in a quote request). Necessary cookies that keep the site secure and usable may still be required for those features to function.',
          },
        ],
      },
      {
        type: 'p',
        spans: [
          {
            text: 'This page explains preferences in general terms. It is not an interactive consent panel. Choices you make in your browser apply to how that browser stores cookies for pakfactory.com.',
          },
        ],
      },
    ],
  },
  {
    heading: 'More detail',
    parts: [
      {
        type: 'p',
        spans: [
          {
            text: 'Our ',
          },
          {text: 'Privacy Policy', href: '/policies/privacy-policy'},
          {
            text: ' describes how we collect and use information, including cookies. Review that policy for the full picture, including how to withdraw consent where it applies.',
          },
        ],
      },
    ],
  },
  {
    heading: 'Contact',
    parts: [
      {
        type: 'p',
        spans: [
          {
            text: 'Questions about cookies or privacy? Reach us through our ',
          },
          {text: 'Contact', href: '/contact'},
          {text: ' page or your usual PakFactory contact.'},
        ],
      },
    ],
  },
]

/**
 * @param {Span[]} spans
 * @param {string} keyBase
 */
function childrenFromSpans(spans, keyBase) {
  const markDefs = []
  const children = []
  let i = 0
  for (const span of spans) {
    const marks = []
    if (span.strong) marks.push('strong')
    if (span.href) {
      const linkKey = `${keyBase}-l${i}`
      markDefs.push({_key: linkKey, _type: 'link', href: span.href})
      marks.push(linkKey)
    }
    children.push({
      _type: 'span',
      _key: `${keyBase}-s${i}`,
      text: span.text,
      marks,
    })
    i += 1
  }
  return {children, markDefs}
}

function buildBody() {
  const blocks = []
  let n = 0
  for (const section of COOKIES_SECTIONS) {
    const hKey = `h${n++}`
    blocks.push({
      _type: 'block',
      _key: hKey,
      style: 'h3',
      markDefs: [],
      children: [
        {_type: 'span', _key: `${hKey}-span`, text: section.heading, marks: []},
      ],
    })
    for (const part of section.parts) {
      if (part.type === 'p') {
        const key = `p${n++}`
        const {children, markDefs} = childrenFromSpans(part.spans, key)
        blocks.push({
          _type: 'block',
          _key: key,
          style: 'normal',
          markDefs,
          children,
        })
        continue
      }
      for (const item of part.items) {
        const key = `li${n++}`
        const {children, markDefs} = childrenFromSpans(item, key)
        blocks.push({
          _type: 'block',
          _key: key,
          style: 'normal',
          listItem: 'bullet',
          level: 1,
          markDefs,
          children,
        })
      }
    }
  }
  return blocks
}

function buildDoc(body) {
  return {
    _id: COOKIES_ID,
    _type: 'legalPage',
    title: 'Cookies Preference',
    lastUpdated: LAST_UPDATED,
    metaTitle: 'Cookies Preference',
    metaDescription: META_DESCRIPTION,
    allowIndex: true,
    allowFollow: true,
    body,
  }
}

async function seed() {
  const mode = describeMode({confirm: apply, dataset: DATASET})
  console.log(`\n🌱  Cookies Preference → ${DATASET} (${PROJECT_ID}) — ${mode}\n`)

  const existing = await client.fetch(
    `*[_id == $id || _id == "drafts." + $id][0]{_id, title, lastUpdated, "bodyLen": count(body)}`,
    {id: COOKIES_ID},
  )
  const body = buildBody()
  const doc = buildDoc(body)
  const action = existing ? 'REPLACE' : 'CREATE'

  console.log(`  [${action}] ${COOKIES_ID} → /policies/cookies-preference`)
  console.log(`    sections: ${COOKIES_SECTIONS.length}`)
  console.log(`    blocks:   ${body.length}`)
  if (existing) {
    console.log(
      `    before:   id=${existing._id} lastUpdated=${existing.lastUpdated ?? '—'} bodyLen=${existing.bodyLen ?? 0}`,
    )
  }
  console.log(`    after:    lastUpdated=${LAST_UPDATED} bodyLen=${body.length}`)

  if (!apply) {
    console.log(
      `\nDry run on dataset=${DATASET} — would ${action} ${COOKIES_ID}. Pass --confirm to write.\n`,
    )
    return
  }

  if (DATASET === 'production' && !args.yesProduction) {
    console.error('❌  Production writes need --yes-production.')
    process.exit(1)
  }

  await client.createOrReplace(doc)
  console.log(
    `\n✅  ${action}d ${COOKIES_ID} on dataset=${DATASET}. Docs are written as published ids — open Studio or /policies/cookies-preference to verify.\n`,
  )
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
