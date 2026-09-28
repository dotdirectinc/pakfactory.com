/**
 * Move each `expertiseStage.sections` body onto an Expertise Page template
 * (PROD-2577 follow-up, requested 2026-09-25).
 *
 * The stage's `sections` field leaves the schema in the same PR; the body now
 * lives on an `expertiseStagePage` document (Main Website → Expertise Pages)
 * that the stage selects via `template`. For every stage that still holds
 * `sections`, this:
 *   1. creates `expertiseStagePage.<stage slug>` titled after the stage
 *      (e.g. "Packaging Design") with the stage's sections, keys unchanged;
 *   2. sets `stage.template` → that document;
 *   3. unsets `stage.sections`.
 * One transaction per stage, so a stage is never left half-moved.
 *
 * Drafts: published stages are processed first, so a draft stage's reference
 * to the published template id resolves. A draft whose sections differ from the
 * published stage gets a draft template (`drafts.expertiseStagePage.<slug>`) —
 * publish it in the Studio; a draft with identical sections just links. A
 * draft-only stage (nothing published) gets a weak reference, strengthened when
 * the template is published. This script never publishes.
 *
 * Refuses (and says so) when the template id already exists with sections of
 * its own: overwriting it could drop edits made on the template. Resolve by hand.
 *
 * Idempotent: a stage without `sections` is skipped.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 * 🔴 Run it through the register:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20260925-expertise-stage-template --confirm
 *
 * The script's own interface:
 *   pnpm --filter @pakfactory/studio run migrate:expertise-stage-template -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:expertise-stage-template -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:expertise-stage-template -- --dataset production --confirm --yes-production
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content — agent guardrails).
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:expertise-stage-template -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.')
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

const TEMPLATE_TYPE = 'expertiseStagePage'
const templateIdFor = (slug) => `${TEMPLATE_TYPE}.${slug}`

async function main() {
  console.log(
    `\nmigrate:expertise-stage-template  project=${PROJECT_ID}  dataset=${DATASET}  ${describeMode(args)}\n`,
  )

  // Raw perspective: published and drafts both come back; drafts carry the prefix.
  const stages = await client.fetch(
    `*[_type == "expertiseStage" && defined(sections)]{
      _id, title, "slug": slug.current, sections, "templateRef": template._ref
    }`,
  )
  // Published before drafts: a draft stage references the PUBLISHED template id,
  // which must exist by the time its patch commits (Sanity rejects a strong
  // reference to a missing document — first run on development failed exactly so).
  stages.sort(
    (a, b) =>
      Number(a._id.startsWith('drafts.')) - Number(b._id.startsWith('drafts.')) ||
      a._id.localeCompare(b._id),
  )
  const publishedBySlug = new Map(
    stages.filter((s) => !s._id.startsWith('drafts.')).map((s) => [s.slug, s]),
  )

  if (stages.length === 0) {
    console.log(`Nothing to do on dataset=${DATASET} — no expertiseStage holds sections.\n`)
    return
  }

  const plans = []
  for (const stage of stages) {
    const isDraft = stage._id.startsWith('drafts.')
    if (!stage.slug) {
      console.log(`  ⚠️  skip ${stage._id}: no slug to name the template by — move it by hand.`)
      continue
    }
    const baseId = templateIdFor(stage.slug)
    const templateId = isDraft ? `drafts.${baseId}` : baseId
    const existing = await client.fetch(`*[_id == $id][0]{ _id, "count": count(sections) }`, {
      id: templateId,
    })
    if (existing && (existing.count ?? 0) > 0) {
      console.log(
        `  ⚠️  skip ${stage._id}: ${templateId} already exists with ${existing.count} section(s). ` +
          `Compare the two and resolve by hand — overwriting could drop template edits.`,
      )
      continue
    }
    if (stage.templateRef && stage.templateRef !== baseId) {
      console.log(
        `  ⚠️  skip ${stage._id}: already points at template ${stage.templateRef} but still holds ` +
          `sections. Decide which body is right by hand.`,
      )
      continue
    }
    let draftMatchesPublished = false
    let weakRef = false
    if (isDraft) {
      const published = publishedBySlug.get(stage.slug)
      // Draft body identical to the published one → no draft template needed.
      draftMatchesPublished =
        Boolean(published) && JSON.stringify(published.sections) === JSON.stringify(stage.sections)
      // Will the published template exist when this draft is patched? Yes if it
      // already exists or this run creates it (published stages go first).
      const publishedTemplateExists = await client.fetch(`count(*[_id == $id]) > 0`, { id: baseId })
      const createdThisRun = plans.some((p) => !p.isDraft && p.baseId === baseId)
      weakRef = !publishedTemplateExists && !createdThisRun
    }
    plans.push({ stage, templateId, baseId, isDraft, draftMatchesPublished, weakRef })
  }

  console.log(`Planned (${plans.length} of ${stages.length} stage document(s)):`)
  for (const { stage, templateId, baseId, draftMatchesPublished, weakRef } of plans) {
    const types = (stage.sections ?? []).map((s) => s._type).join(' → ')
    console.log(`  ${stage._id} (${stage.title})`)
    if (draftMatchesPublished) {
      console.log(`     sections identical to the published stage — no draft template`)
    } else {
      console.log(`     create ${templateId} "${stage.title}" with ${stage.sections.length} section(s): ${types}`)
    }
    console.log(
      `     set template → ${baseId}${weakRef ? ' (weak until the template is published)' : ''}, unset sections`,
    )
  }

  if (!apply) {
    console.log(
      `\nDRY-RUN on dataset=${DATASET} — nothing written. Re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`,
    )
    return
  }

  for (const { stage, templateId, baseId, draftMatchesPublished, weakRef } of plans) {
    const tx = client.transaction()
    if (!draftMatchesPublished) {
      tx.createOrReplace({
        _id: templateId,
        _type: TEMPLATE_TYPE,
        title: stage.title,
        sections: stage.sections,
      })
    }
    // Draft-only stage with no published template yet: weak reference that the
    // Studio strengthens on publish (its own pattern for refs to drafts).
    const templateRef = weakRef
      ? {
          _type: 'reference',
          _ref: baseId,
          _weak: true,
          _strengthenOnPublish: { type: TEMPLATE_TYPE },
        }
      : { _type: 'reference', _ref: baseId }
    tx.patch(stage._id, (p) => p.set({ template: templateRef }).unset(['sections']))
    const result = await tx.commit()
    console.log(`  ✅ ${stage._id} → ${templateId} (transaction ${result.transactionId})`)
  }
  console.log(
    `\nDone on dataset=${DATASET}. Drafts touched above still need publishing in the Studio.\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
