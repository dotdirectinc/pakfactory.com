#!/usr/bin/env node
/**
 * Seed Contact Page `contactDirectory` section (heading, intro, ways to reach us).
 *
 * Patches the pinned `contentPage` id `contactPage` (and its draft if one
 * exists). Upserts one `contactDirectory` section (stable `_key`), keeps other
 * sections, and unsets legacy Content-tab fields (`headline`, `intro`,
 * `channels`). Re-running replaces the directory section payload — safe while
 * copy is still starter content.
 *
 * Global Settings contact facts (phone, email, address, hours) are never
 * written here.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:contact-page -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:contact-page -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:contact-page -- --dataset production --confirm --yes-production
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
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:contact-page -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.

  Upserts a contactDirectory section on contactPage (+ draft if present).
  Unsets legacy headline/intro/channels. Does not touch Global Settings.`

const args = parseScriptArgs({usage: USAGE})
const {confirm: apply} = args
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

const CONTACT_ID = 'contactPage'
const DIRECTORY_KEY = 'contact-directory-hub'

const HEADLINE = 'Contact us'
const INTRO =
  'Whatever you need, pick the fastest way to reach us. Call, chat or send us a message. We get back to you within 1–2 business days (Monday–Friday, 9:30 AM–6:30 PM EST).'

function choice(key, value, label, hint) {
  return {
    _type: 'enquiryChoice',
    _key: key,
    value,
    label,
    ...(hint ? {hint} : {}),
  }
}

function field(key, kind, label, opts = {}) {
  const {required = true, placeholder, options} = opts
  return {
    _type: 'enquiryField',
    _key: key,
    kind,
    label,
    required,
    ...(placeholder ? {placeholder} : {}),
    ...(options ? {options} : {}),
  }
}

function screen(key, heading, fields, helper) {
  return {
    _type: 'enquiryScreen',
    _key: key,
    heading,
    ...(helper ? {helper} : {}),
    fields,
  }
}

const NAME_FIELDS = (prefix) => [
  field(`${prefix}-first`, 'text', 'First name'),
  field(`${prefix}-last`, 'text', 'Last name'),
  field(`${prefix}-email`, 'email', 'Email'),
]

const CHANNELS = [
  {
    _type: 'contactChannel',
    _key: 'contact-channel-quote',
    title: 'Request a quote',
    line: 'Custom packaging, packaging services, or both. A packaging specialist gets back to you within 1–2 business days.',
    ctaLabel: 'Start your quote',
    action: 'link',
    link: {
      linkType: 'path',
      relativePath: '/request/general',
    },
  },
  {
    _type: 'contactChannel',
    _key: 'contact-channel-ask',
    title: 'Ask a question',
    line: 'Not sure what you need? Our packaging experts can help.',
    ctaLabel: 'Ask a question',
    action: 'enquiry',
    enquirySlug: {_type: 'slug', current: 'ask-a-question'},
    sendTo: 'support',
    sendLabel: 'Send question',
    sentTitle: 'Message sent',
    sentBody:
      'Thanks! A packaging expert will reply by email within 1–2 business days.',
    screens: [
      screen(
        'contact-enq-ask-screen-question',
        'Your question',
        [
          field('contact-enq-ask-field-message', 'textarea', 'Your question', {
            placeholder: 'e.g. Do you make compostable mailer boxes?',
          }),
        ],
      ),
      screen(
        'contact-enq-ask-screen-contact',
        'Contact information',
        [
          ...NAME_FIELDS('contact-enq-ask'),
          field('contact-enq-ask-phone', 'tel', 'Phone', {required: false}),
        ],
      ),
    ],
  },
  {
    _type: 'contactChannel',
    _key: 'contact-channel-order-help',
    title: 'Existing order / support',
    line: 'Something about an order you placed.',
    ctaLabel: 'Get order help',
    action: 'enquiry',
    enquirySlug: {_type: 'slug', current: 'order-help'},
    sendTo: 'support',
    sendLabel: 'Send to support',
    sentTitle: 'We’ve got it',
    sentBody:
      'Our support team will reply by email within 1–2 business days.',
    screens: [
      screen(
        'contact-enq-order-screen-order',
        'Order or quote number',
        [
          field(
            'contact-enq-order-field-number',
            'text',
            'Order or quote number',
          ),
        ],
      ),
      screen('contact-enq-order-screen-topic', 'Topic', [
        field('contact-enq-order-field-topic', 'choice', 'Topic', {
          options: [
            choice('contact-enq-order-opt-delivery', 'delivery', 'Delivery'),
            choice(
              'contact-enq-order-opt-quality',
              'quality',
              'Quality issue',
            ),
            choice(
              'contact-enq-order-opt-change',
              'change',
              'Change my order',
            ),
            choice('contact-enq-order-opt-billing', 'billing', 'Billing'),
            choice(
              'contact-enq-order-opt-other',
              'other',
              'Something else',
            ),
          ],
        }),
      ]),
      screen(
        'contact-enq-order-screen-details',
        'Details',
        [
          field('contact-enq-order-field-details', 'textarea', 'Details'),
        ],
      ),
      screen(
        'contact-enq-order-screen-contact',
        'Contact information',
        [
          ...NAME_FIELDS('contact-enq-order'),
          field('contact-enq-order-phone', 'tel', 'Phone', {required: false}),
        ],
      ),
    ],
  },
  {
    _type: 'contactChannel',
    _key: 'contact-channel-partnerships',
    title: 'Partnerships',
    line: 'Resellers, agencies and brand collaborations.',
    ctaLabel: 'Get in touch',
    action: 'enquiry',
    enquirySlug: {_type: 'slug', current: 'partnerships'},
    sendTo: 'sales',
    sendLabel: 'Send',
    sentTitle: 'Message sent',
    sentBody:
      'Thanks. Our team will review it and get back to you by email.',
    screens: [
      screen(
        'contact-enq-partner-screen-type',
        'Partnership type',
        [
          field(
            'contact-enq-partner-field-type',
            'choice',
            'Partnership type',
            {
              options: [
                choice(
                  'contact-enq-partner-opt-reseller',
                  'reseller',
                  'Reseller / distributor',
                  'Sell or distribute our packaging',
                ),
                choice(
                  'contact-enq-partner-opt-agency',
                  'agency',
                  'Agency',
                  'Packaging for your clients',
                ),
                choice(
                  'contact-enq-partner-opt-brand',
                  'brand',
                  'Brand collaboration',
                  'Work on something together',
                ),
                choice(
                  'contact-enq-partner-opt-other',
                  'other',
                  'Something else',
                ),
              ],
            },
          ),
        ],
      ),
      screen(
        'contact-enq-partner-screen-about',
        'About the partnership',
        [
          field(
            'contact-enq-partner-field-about',
            'textarea',
            'About the partnership',
          ),
        ],
      ),
      screen('contact-enq-partner-screen-contact', 'Contact information', [
        ...NAME_FIELDS('contact-enq-partner'),
        field('contact-enq-partner-company', 'text', 'Company'),
        field('contact-enq-partner-website', 'text', 'Website', {
          required: false,
          placeholder: 'https://',
        }),
      ]),
    ],
  },
  {
    _type: 'contactChannel',
    _key: 'contact-channel-press',
    title: 'Press & media',
    line: 'Stories, interviews and media requests.',
    ctaLabel: 'Contact our team',
    action: 'enquiry',
    enquirySlug: {_type: 'slug', current: 'press'},
    sendTo: 'marketing',
    sendLabel: 'Send to our team',
    sentTitle: 'Message sent',
    sentBody:
      'Thanks. Our marketing team will get back to you by email.',
    screens: [
      screen('contact-enq-press-screen-request', 'Your request', [
        field(
          'contact-enq-press-field-outlet',
          'text',
          'Publication or outlet',
        ),
        field('contact-enq-press-field-topic', 'text', 'Topic'),
        field('contact-enq-press-field-message', 'textarea', 'Your request'),
        field('contact-enq-press-field-deadline', 'text', 'Deadline', {
          required: false,
          placeholder: 'e.g. Friday, Nov 14',
        }),
      ]),
      screen(
        'contact-enq-press-screen-contact',
        'Contact information',
        NAME_FIELDS('contact-enq-press'),
      ),
    ],
  },
  {
    _type: 'contactChannel',
    _key: 'contact-channel-chat',
    title: 'Chat now',
    line: 'Talk to us live.',
    ctaLabel: 'Start chat',
    action: 'chat',
  },
]

/** Upserted `contactDirectory` section (stable key). */
const DIRECTORY_SECTION = {
  _type: 'contactDirectory',
  _key: DIRECTORY_KEY,
  heading: HEADLINE,
  intro: INTRO,
  showLiveSupport: true,
  showTopBorder: true,
  showBottomBorder: true,
  paddingBlock: 'none',
  channels: CHANNELS,
}

const STUB_DOC = {
  _id: CONTACT_ID,
  _type: 'contentPage',
  title: 'Contact',
  metaTitle: 'Contact PakFactory',
  metaDescription:
    'Talk to PakFactory packaging experts. Request a quote or reach our team.',
  allowIndex: true,
  allowFollow: true,
  sections: [DIRECTORY_SECTION],
}

function mergeSections(existing) {
  const others = Array.isArray(existing)
    ? existing.filter(
        (row) =>
          row &&
          typeof row === 'object' &&
          row._type !== 'contactDirectory' &&
          row._key !== DIRECTORY_KEY,
      )
    : []
  return [DIRECTORY_SECTION, ...others]
}

async function seed() {
  console.log(
    `\n🌱  Contact directory section → dataset=${DATASET} (${PROJECT_ID}) · ${describeMode({confirm: apply, dataset: DATASET})}\n`,
  )

  const docs = await client.fetch(
    `*[_id in [$id, "drafts." + $id]]{
      _id,
      title,
      sections[]{_key, _type},
      "legacyChannels": count(channels)
    }`,
    {id: CONTACT_ID},
  )
  const published = docs.find((d) => d._id === CONTACT_ID)
  const draft = docs.find((d) => d._id === `drafts.${CONTACT_ID}`)

  const plans = [
    {
      id: CONTACT_ID,
      exists: Boolean(published),
      sections: published?.sections ?? [],
      legacyChannels: published?.legacyChannels ?? 0,
    },
  ]
  if (draft) {
    plans.push({
      id: draft._id,
      exists: true,
      sections: draft.sections ?? [],
      legacyChannels: draft.legacyChannels ?? 0,
    })
  }

  console.log(`  Heading: ${HEADLINE}`)
  console.log(`  Channels: ${CHANNELS.length}`)
  for (const ch of CHANNELS) {
    const detail =
      ch.action === 'enquiry'
        ? `enquiry /contact/${ch.enquirySlug.current} → ${ch.sendTo}`
        : ch.action === 'link'
          ? `link ${ch.link.relativePath}`
          : 'chat'
    console.log(`    · ${ch.title} (${detail})`)
  }
  console.log('')
  for (const plan of plans) {
    const dirCount = (plan.sections ?? []).filter(
      (s) => s._type === 'contactDirectory',
    ).length
    console.log(
      `  ${plan.id}: ${plan.exists ? 'upsert contactDirectory + unset legacy Content fields' : 'create stub'} (existing directory sections: ${dirCount}; legacy channels field: ${plan.legacyChannels})`,
    )
  }

  if (!apply) {
    console.log(
      `\n  DRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`,
    )
    return
  }

  if (DATASET === 'production' && !args.yesProduction) {
    console.error('❌  Production writes need --yes-production.')
    process.exit(1)
  }

  const fullDocs = await client.fetch(
    `*[_id in [$id, "drafts." + $id]]{_id, sections}`,
    {id: CONTACT_ID},
  )

  const tx = client.transaction()
  tx.createIfNotExists(STUB_DOC)
  for (const plan of plans) {
    const current = fullDocs.find((d) => d._id === plan.id)
    const nextSections = mergeSections(current?.sections)
    tx.patch(plan.id, (p) =>
      p
        .set({sections: nextSections})
        .unset(['headline', 'intro', 'channels']),
    )
  }
  await tx.commit({autoGenerateArrayKeys: false})

  console.log(
    `\n✅  Wrote contactDirectory on ${plans.length} doc(s) on dataset=${DATASET}. Open /contact (and Studio → Contact Page → Sections) to verify.\n`,
  )
}

seed().catch((err) => {
  console.error(`❌  Contact page seed failed on dataset=${DATASET}:`, err.message)
  process.exit(1)
})
