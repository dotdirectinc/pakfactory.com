/**
 * Migrate `redirect.channel` (the retired hardcoded dropdown) to `redirect.group`
 * references pointing at editor-managed `redirectGroup` documents.
 *
 * What it does, idempotently:
 *   1. Reads every distinct `channel` value still in use on `redirect` docs.
 *   2. Creates one `redirectGroup` per distinct value (createIfNotExists on a
 *      deterministic id, so re-runs never duplicate).
 *   3. Points each redirect's `group` at its group — skipping any doc that
 *      already has a `group` (an editor may have re-filed it by hand).
 *
 * It does NOT unset `channel`. That field stays as the rollback buffer until the
 * follow-up PR removes it from the schema, matching the PROD-2116 / legacy-`type`
 * retirement sequence. Run `--unset-channel` in that follow-up to clear it.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run migrate:redirect-groups
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run migrate:redirect-groups -- --apply
 *   NEXT_PUBLIC_SANITY_DATASET=production  pnpm --filter @pakfactory/studio run migrate:redirect-groups -- --apply
 *
 * Requires a WRITE token (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`).
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const apply = process.argv.includes('--apply')
const unsetChannel = process.argv.includes('--unset-channel')

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET || 'development'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: TOKEN,
  useCdn: false,
})

/**
 * Display titles for the channel values that actually exist. Anything else keeps
 * its raw value title-cased, so an unexpected channel still migrates rather than
 * being silently dropped.
 */
const TITLES = {
  blog: 'Blog',
  website: 'Case Studies',
  products: 'Products',
  solutions: 'Solutions',
  expertise: 'Expertise',
  academy: 'Academy',
}

/**
 * `website` becomes the `case-studies` group: the 36 docs carrying it are all
 * blog→case-studies rules whose destination is a case study. Keeping the slug
 * meaningful matters because `AUTO_REDIRECT_GROUP.caseStudies` looks it up.
 */
const SLUGS = { website: 'case-studies' }

const ORDER = { blog: 0, 'case-studies': 1 }

const titleFor = (ch) => TITLES[ch] || ch.charAt(0).toUpperCase() + ch.slice(1)
const slugFor = (ch) => SLUGS[ch] || ch

async function main() {
  console.log(`\n📦  project ${PROJECT_ID} · dataset ${DATASET}`)
  console.log(apply ? '⚠️   APPLY — writes will be made\n' : '🔍  DRY RUN — nothing will be written\n')

  const redirects = await client.fetch(
    `*[_type == "redirect"]{ _id, from, channel, "groupId": group._ref }`,
  )
  console.log(`Found ${redirects.length} redirect docs.`)

  const channels = [...new Set(redirects.map((r) => r.channel).filter(Boolean))].sort()
  if (!channels.length) {
    console.log('No `channel` values left to migrate — nothing to do.')
    return
  }
  console.log(`Distinct channel values: ${channels.join(', ')}\n`)

  // ── 1. Ensure a redirectGroup per channel ────────────────────────────────
  const groupIdByChannel = {}
  for (const ch of channels) {
    const slug = slugFor(ch)
    const id = `redirectGroup-${slug}`
    groupIdByChannel[ch] = id
    const count = redirects.filter((r) => r.channel === ch).length
    console.log(`  group "${titleFor(ch)}" (${slug}) ← channel "${ch}" · ${count} redirects`)
    if (!apply) continue
    await client.createIfNotExists({
      _id: id,
      _type: 'redirectGroup',
      title: titleFor(ch),
      slug: { _type: 'slug', current: slug },
      order: ORDER[slug] ?? 10,
      description: `Migrated from the retired \`channel: "${ch}"\` value.`,
    })
  }

  // ── 2. Point each redirect at its group ──────────────────────────────────
  const needsGroup = redirects.filter((r) => r.channel && !r.groupId)
  const alreadyGrouped = redirects.filter((r) => r.groupId).length
  console.log(
    `\n${needsGroup.length} redirects need a group · ${alreadyGrouped} already grouped (left alone)`,
  )

  if (apply && needsGroup.length) {
    let tx = client.transaction()
    let n = 0
    for (const r of needsGroup) {
      tx = tx.patch(r._id, (p) =>
        p.set({ group: { _type: 'reference', _ref: groupIdByChannel[r.channel] } }),
      )
      // Commit in batches so one oversized transaction can't fail the whole run.
      if (++n % 100 === 0) {
        await tx.commit()
        tx = client.transaction()
      }
    }
    if (n % 100 !== 0) await tx.commit()
    console.log(`✅  Grouped ${needsGroup.length} redirects.`)
  }

  // ── 3. Optional: clear the deprecated field (follow-up PR only) ──────────
  if (unsetChannel) {
    const withChannel = redirects.filter((r) => r.channel)
    console.log(`\n--unset-channel: clearing \`channel\` on ${withChannel.length} docs`)
    if (apply) {
      let tx = client.transaction()
      let n = 0
      for (const r of withChannel) {
        tx = tx.patch(r._id, (p) => p.unset(['channel']))
        if (++n % 100 === 0) {
          await tx.commit()
          tx = client.transaction()
        }
      }
      if (n % 100 !== 0) await tx.commit()
      console.log('✅  Cleared.')
    }
  }

  if (!apply) console.log('\n🔍  Dry run complete — re-run with `-- --apply` to write.')
}

main().catch((err) => {
  console.error('❌  Migration failed:', err.message)
  process.exit(1)
})
