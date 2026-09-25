/**
 * Shared runner for expertise stage page seeds (PROD-2577 Strategy, PROD-2578
 * Design, …). Each stage script supplies content only; this module owns the
 * client, lookups, dry-run plan and the single transaction.
 *
 * Writes (only with --confirm):
 *   - `expertiseService` docs (createOrReplace, fixed ids) — the stage's services
 *   - contextual `faq` docs (createOrReplace, fixed ids)
 *   - the stage's Expertise Page template `expertiseStagePage.<stage slug>`
 *     (createOrReplace) — title + the whole body `sections[]`
 *   - a patch on the existing `expertiseStage`: hero/SEO fields, `services`,
 *     `faqs`, `featuredStudies`, `template` → the template; legacy `sections`
 *     unset (the body moved to the template, PROD-2577 follow-up)
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content — agent
 * guardrails). Flags per `.claude/rules/dataset-script-placement-and-flags.md`.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../../..')

export function plainBlock(text, key) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }],
  }
}

export function ref(id, key) {
  return { _type: 'reference', _ref: id, ...(key ? { _key: key } : {}) }
}

export function pathLink(label, relativePath) {
  return { label, linkType: 'path', relativePath }
}

export function internalLink(label, documentId) {
  return { label, linkType: 'internal', internalLink: ref(documentId) }
}

/** POC trust strip ("Trusted by 5,000+ brands across 20+ industries") as a Logo wall. */
export const TRUST_STRIP_CLIENT_SLUGS = [
  'coca-cola',
  'east-west-bank',
  'venture',
  'hello-adorn',
  'blind-barrels',
  'via-carota',
  'serena-sleep',
  'hrbls',
  'hex-coffee',
  'vitamin-bar',
]

export function trustStripSection(key, clientIdBySlug) {
  return {
    _type: 'logoWall',
    _key: key,
    heading: 'Trusted by 5,000+ brands across 20+ industries',
    curatedItems: TRUST_STRIP_CLIENT_SLUGS.filter((slug) => clientIdBySlug.has(slug)).map(
      (slug) => ref(clientIdBySlug.get(slug), `client-${slug}`),
    ),
  }
}

/**
 * Typed Inspiration gallery cards from case studies — reuses each study's card
 * image asset (no upload) and links to the study (internal ref).
 */
export function caseStudyGalleryCards(slugs, caseStudyBySlug) {
  return slugs
    .map((slug) => caseStudyBySlug.get(slug))
    .filter((doc) => doc?.imageRef)
    .map((doc) => ({
      _type: 'inspirationsCard',
      _key: `work-${doc.slug}`,
      title: doc.title,
      ...(doc.clientName ? { description: doc.clientName } : {}),
      image: {
        _type: 'image',
        asset: { _type: 'reference', _ref: doc.imageRef },
        alt: doc.imageAlt || doc.title,
      },
      link: { linkType: 'internal', internalLink: ref(doc._id) },
    }))
}

/**
 * @param {object} spec
 * @param {string} spec.task            pnpm task name, e.g. 'seed:expertise-design'
 * @param {string} spec.stageSlug       existing expertiseStage slug
 * @param {string} spec.idPrefix        short stage key for fixed ids, e.g. 'design'
 * @param {object} spec.stage           fields set on the stage (tagline, h1, description, heroCtaLabel, metaTitle, metaDescription)
 * @param {Array<{key: string, title: string, summary?: string, points?: Array<{label: string, gloss?: string}>}>} spec.services
 * @param {Array<{key: string, question: string, answer: string}>} spec.faqs
 * @param {string[]} spec.caseStudySlugs featured case studies, in order (missing ones are skipped)
 * @param {string} [spec.templateTitle] Expertise Page template title; defaults to the stage title
 * @param {string[]} [spec.logoClientSlugs] clients (with logos) for the trust strip, in order
 * @param {string[]} [spec.galleryCaseStudySlugs] case studies whose card images feed a work gallery
 * @param {(ctx: {serviceId: (key: string) => string, stageIdBySlug: Map<string, string>, clientIdBySlug: Map<string, string>, caseStudyBySlug: Map<string, {_id: string, title: string, clientName?: string, imageRef?: string, imageAlt?: string}>}) => object[]} spec.buildSections
 * @param {string[]} [spec.editorNotes] printed after the plan — what editors still add in Studio
 */
export async function runExpertiseStageSeed(spec) {
  loadEnv({ path: join(repoRoot, '.env.local') })
  loadEnv({ path: join(repoRoot, '.env') })
  loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

  const usage = `Usage:
  pnpm --filter @pakfactory/studio run ${spec.task} -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

  const args = parseScriptArgs({ usage })
  const apply = args.confirm
  const dataset = args.dataset
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

  if (!token) {
    console.error('❌  Missing Sanity token in .env.local')
    process.exit(1)
  }
  if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
    console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN).')
    process.exit(1)
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
    token,
    useCdn: false,
    perspective: 'raw',
  })

  const serviceId = (key) => `expertiseService.${spec.idPrefix}-${key}`
  const faqId = (key) => `faq.expertise-${spec.idPrefix}-${key}`

  console.log(`\n${spec.task}  project=${projectId}  dataset=${dataset}  ${describeMode(args)}\n`)

  const stages = await client.fetch(
    `*[_type == "expertiseStage" && defined(slug.current) && !(_id in path("drafts.**"))]{
      _id, title, "slug": slug.current, "sectionCount": count(sections)
    }`,
  )
  const stageIdBySlug = new Map(stages.map((s) => [s.slug, s._id]))
  const stage = stages.find((s) => s.slug === spec.stageSlug)
  if (!stage) {
    console.error(`❌  No published expertiseStage with slug "${spec.stageSlug}" in ${dataset}.`)
    process.exit(1)
  }

  const helpCategoryId = await client.fetch(
    `*[_type == "helpCategory" && !(_id in path("drafts.**"))] | order(_createdAt asc)[0]._id`,
  )
  if (!helpCategoryId) {
    console.error(`❌  No helpCategory in ${dataset}. FAQs require one (the set is fixed — create it in Studio first).`)
    process.exit(1)
  }

  const studies = await client.fetch(
    `*[_type == "caseStudy" && slug.current in $slugs && !(_id in path("drafts.**"))]{ _id, "slug": slug.current }`,
    { slugs: spec.caseStudySlugs },
  )
  const studyBySlug = new Map(studies.map((s) => [s.slug, s._id]))
  const featured = spec.caseStudySlugs.filter((slug) => studyBySlug.has(slug))
  const missingStudies = spec.caseStudySlugs.filter((slug) => !studyBySlug.has(slug))

  const clientSlugs = spec.logoClientSlugs ?? []
  const clients = await client.fetch(
    `*[_type == "client" && slug.current in $slugs && defined(logo.asset) && !(_id in path("drafts.**"))]{ _id, "slug": slug.current }`,
    { slugs: clientSlugs },
  )
  const clientIdBySlug = new Map(clients.map((c) => [c.slug, c._id]))
  const missingClients = clientSlugs.filter((slug) => !clientIdBySlug.has(slug))

  const gallerySlugs = spec.galleryCaseStudySlugs ?? []
  const galleryDocs = await client.fetch(
    `*[_type == "caseStudy" && slug.current in $slugs && !(_id in path("drafts.**"))]{
      _id, title, "slug": slug.current, "clientName": client->name,
      "imageRef": cardImage.asset._ref, "imageAlt": coalesce(cardImageAlt, cardImage.alt)
    }`,
    { slugs: gallerySlugs },
  )
  const caseStudyBySlug = new Map(galleryDocs.map((d) => [d.slug, d]))
  const missingGallery = gallerySlugs.filter(
    (slug) => !caseStudyBySlug.get(slug)?.imageRef,
  )

  const templateId = `expertiseStagePage.${spec.stageSlug}`
  const templateTitle = spec.templateTitle || stage.title

  const existingIds = new Set(
    await client.fetch(`*[_id in $ids]._id`, {
      ids: [
        ...spec.services.map((s) => serviceId(s.key)),
        ...spec.faqs.map((f) => faqId(f.key)),
        templateId,
      ],
    }),
  )

  const sections = spec.buildSections({ serviceId, stageIdBySlug, clientIdBySlug, caseStudyBySlug })

  console.log(`Stage: ${stage._id} (${stage.title}) — ${stage.sectionCount ?? 0} section(s) today`)
  console.log(`Help category: ${helpCategoryId}`)
  console.log(`Featured case studies: ${featured.join(', ') || '(none)'}`)
  if (missingStudies.length) {
    console.log(`  ⚠️  not found, skipped: ${missingStudies.join(', ')} (section falls back to tagged studies)`)
  }

  console.log(`\nPlanned writes:`)
  for (const s of spec.services) {
    console.log(`  ${existingIds.has(serviceId(s.key)) ? 'replace' : 'create '} ${serviceId(s.key)} — ${s.title}`)
  }
  for (const f of spec.faqs) {
    console.log(`  ${existingIds.has(faqId(f.key)) ? 'replace' : 'create '} ${faqId(f.key)} — ${f.question}`)
  }
  console.log(
    `  ${existingIds.has(templateId) ? 'replace' : 'create '} ${templateId} — Expertise Page "${templateTitle}", ${sections.length} section(s)`,
  )
  console.log(
    `  patch   ${stage._id} — hero + SEO fields, services(${spec.services.length}), faqs(${spec.faqs.length}), featuredStudies(${featured.length}), template → ${templateId}${stage.sectionCount ? `, unset ${stage.sectionCount} legacy section(s)` : ''}`,
  )
  if (missingClients.length) {
    console.log(`  ⚠️  trust-strip clients not found (or no logo), skipped: ${missingClients.join(', ')}`)
  }
  if (missingGallery.length) {
    console.log(`  ⚠️  gallery case studies not found (or no card image), skipped: ${missingGallery.join(', ')}`)
  }
  console.log(`\nSections: ${sections.map((s) => s._type).join(' → ')}`)
  for (const note of spec.editorNotes ?? []) console.log(`Editors: ${note}`)

  if (!apply) {
    console.log(
      `\nDRY-RUN on ${dataset} — nothing written. Re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`,
    )
    return
  }

  const tx = client.transaction()

  for (const s of spec.services) {
    tx.createOrReplace({
      _id: serviceId(s.key),
      _type: 'expertiseService',
      title: s.title,
      stage: ref(stage._id),
      ...(s.summary ? { summary: s.summary } : {}),
      points: (s.points ?? []).map((point, index) => ({
        _type: 'servicePoint',
        _key: `${s.key}-point-${index + 1}`,
        ...point,
      })),
      hasPage: false,
      status: 'active',
    })
  }

  for (const f of spec.faqs) {
    tx.createOrReplace({
      _id: faqId(f.key),
      _type: 'faq',
      question: f.question,
      slug: { _type: 'slug', current: `${spec.stageSlug}-${f.key}` },
      answer: [plainBlock(f.answer, `${f.key}-a`)],
      scope: 'contextual',
      category: ref(helpCategoryId),
    })
  }

  tx.createOrReplace({
    _id: templateId,
    _type: 'expertiseStagePage',
    title: templateTitle,
    sections,
  })

  tx.patch(stage._id, (p) =>
    p
      .set({
        ...spec.stage,
        services: spec.services.map((s) => ref(serviceId(s.key), `service-${s.key}`)),
        faqs: spec.faqs.map((f) => ref(faqId(f.key), `faq-${f.key}`)),
        featuredStudies: featured.map((slug) => ref(studyBySlug.get(slug), `study-${slug}`)),
        template: ref(templateId),
      })
      .unset(['sections']),
  )

  const result = await tx.commit()
  console.log(
    `\n✅ Committed ${result.results.length} mutation(s) to dataset=${dataset} (transaction ${result.transactionId}).\n`,
  )
}
