/**
 * Seed websiteNavigation singleton to mirror today's hardcoded www chrome
 * (site-nav.ts + buildWwwV5FooterColumns / FOOTER_SOCIAL / FOOTER_AI_LINKS).
 *
 * From repo root:
 *   pnpm seed:website-navigation
 *   pnpm seed:website-navigation -- --dry-run
 *
 * Humans only — agents must not run this script (AGENTS.md Sanity content guardrails).
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/blog/.env.local'), override: true})

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'development'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

const DRY_RUN = process.argv.includes('--dry-run')

if (!TOKEN && !DRY_RUN) {
  console.error('❌  Missing Sanity token in .env.local or apps/blog/.env.local')
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

function footerSection(title, links) {
  return {_key: key(), title, links}
}

function footerColumn(sections) {
  return {_key: key(), sections}
}

const AI_PROMPT = encodeURIComponent(
  'What is PakFactory (pakfactory.com)? Summarize what they do, who they serve, and cite your sources.',
)

/** Mirrors apps/www/src/lib/site-nav.ts + www-nav.ts V5 chrome. */
export function buildWebsiteNavigationSeed(
  wwwBase = WWW_BASE,
  blogBase = BLOG_BASE,
) {
  const w = (path) =>
    `${wwwBase.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const b = (path = '') => {
    const base = blogBase.replace(/\/+$/, '')
    if (!path) return base
    return `${base}${path.startsWith('/') ? path : `/${path}`}`
  }

  function navItem(label, href) {
    return {
      _key: key(),
      label,
      groups: [
        {
          _key: key(),
          label,
          items: [externalLink(href, label)],
        },
      ],
    }
  }

  return {
    _id: 'websiteNavigation',
    _type: 'websiteNavigation',
    cta: {
      label: 'Get a Quote',
      linkType: 'external',
      externalUrl: w('/request/general'),
    },
    items: [
      navItem('Product', w('/products')),
      navItem('Customization', w('/customizations')),
      navItem('Solution', w('/solutions')),
      navItem('Expertise', w('/expertise')),
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
  const doc = buildWebsiteNavigationSeed(WWW_BASE, BLOG_BASE)

  console.log(
    `\n🌱  Website navigation seed → ${DATASET} (${PROJECT_ID})${DRY_RUN ? ' [dry-run]' : ''}\n`,
  )
  console.log(`  www base : ${WWW_BASE}`)
  console.log(`  blog base: ${BLOG_BASE}`)
  console.log(`  items    : ${doc.items.length}`)
  console.log(`  columns  : ${doc.columns.length}`)
  console.log(`  social   : ${doc.socialLinks.length}`)
  console.log(`  ai links : ${doc.aiAnswerLinks.length}`)

  if (DRY_RUN) {
    console.log('\n--- document preview ---\n')
    console.log(JSON.stringify(doc, null, 2))
    console.log('\n✅  Dry run complete (no writes).\n')
    return
  }

  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
    token: TOKEN,
    useCdn: false,
  })

  await client.createOrReplace(doc)
  await publishDocument(client, 'websiteNavigation')

  const verify = await client.fetch(
    `*[_id == "websiteNavigation"][0]{
      _id,
      "itemCount": count(items),
      "columnCount": count(columns),
      "socialCount": count(socialLinks),
      "aiCount": count(aiAnswerLinks),
      cta
    }`,
  )

  console.log(`  ✓  _id         : ${verify?._id}`)
  console.log(`  ✓  items       : ${verify?.itemCount ?? 0}`)
  console.log(`  ✓  columns     : ${verify?.columnCount ?? 0}`)
  console.log(`  ✓  socialLinks : ${verify?.socialCount ?? 0}`)
  console.log(`  ✓  aiAnswerLinks: ${verify?.aiCount ?? 0}`)
  console.log(`  ✓  cta         : ${verify?.cta?.label ?? '(none)'}`)
  console.log(
    '\n✅  websiteNavigation seeded. Confirm in Studio → Main Website → Navigation, then refresh www.\n',
  )
}

seed().catch((err) => {
  console.error('❌  Website navigation seed failed:', err.message)
  process.exit(1)
})
