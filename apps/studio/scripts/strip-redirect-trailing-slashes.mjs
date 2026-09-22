/**
 * Strip trailing slashes from existing `redirect` docs' `to` destination.
 *
 * The site canonicalizes to NO trailing slash (blog `proxy.ts` 308-redirects
 * `/x/` → `/x`), so a trailing slash on `to` is redundant. The proxy already
 * normalizes at request time, so this is DATA HYGIENE ONLY — redirects resolve
 * correctly with or without it. Run it to make the destinations read canonical.
 *
 * `from` is left untouched — it's the old indexed URL and legitimately keeps its
 * trailing slash (this matches the schema, which guards `to` only).
 *
 * From repo root (DRY-RUN is the default — it only prints; nothing is written):
 *   pnpm --filter @pakfactory/studio run migrate:redirect-slashes -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:redirect-slashes -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:redirect-slashes -- --dataset production --confirm --yes-production
 *   pnpm --filter @pakfactory/studio run migrate:redirect-slashes -- --apply
 *
 * Target the right dataset via env (defaults below). Redirects live in the
 * shared `production` dataset:
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token is not enough for --apply.
 *
 * Notes:
 * - Processes published docs. If a redirect also has an open DRAFT, republish it
 *   in Studio afterward (or discard the draft) so the draft doesn't reintroduce
 *   the slash — drafts are reported, not written.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:redirect-slashes -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })

const apply = args.confirm

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
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot patch.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
})

/** Mirror of the schema's `hasTrailingSlash` — same canonicalization the proxy applies. */
function stripTrailingSlash(value) {
  if (typeof value !== 'string' || !value.endsWith('/')) return value
  if (value.startsWith('/')) return value.length > 1 ? value.replace(/\/+$/, '') : value
  try {
    const u = new URL(value)
    if (u.pathname === '/') return value // bare origin — leave as-is
    u.pathname = u.pathname.replace(/\/+$/, '')
    return u.toString()
  } catch {
    return value
  }
}

async function main() {
  console.log(`\n🔎  redirect trailing-slash cleanup`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${apply ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}\n`)

  // Published docs only; drafts are reported separately.
  const docs = await client.fetch(
    `*[_type == "redirect" && !(_id in path("drafts.**"))]{ _id, from, to }`,
  )
  const draftIds = await client.fetch(
    `*[_type == "redirect" && _id in path("drafts.**")]._id`,
  )

  // Only the `to` destination is normalized. `from` is the old indexed URL and
  // legitimately keeps its trailing slash (the proxy normalizes it when matching),
  // matching the schema, which guards `to` only. `from` is left untouched — so
  // there's no `from`-uniqueness collision to worry about.
  const changes = []
  for (const d of docs) {
    const nextTo = stripTrailingSlash(d.to)
    if (nextTo !== d.to) {
      changes.push({ _id: d._id, to: d.to, nextTo })
    }
  }

  if (changes.length === 0) {
    console.log('✅  Nothing to change — every `to` is already slashless.\n')
    return
  }

  for (const c of changes) {
    console.log(`${apply ? '✏️ ' : '•'} ${c._id}`)
    console.log(`     to:   ${c.to}  →  ${c.nextTo}`)
  }

  if (draftIds.length) {
    console.log(`\n⚠️  ${draftIds.length} redirect(s) have open DRAFTS — republish/discard them after this run so drafts don't reintroduce a slash:`)
    draftIds.forEach((id) => console.log(`     ${id}`))
  }

  console.log(`\n${changes.length} doc(s) with a trailing-slash \`to\` to normalize`)

  if (!apply) {
    console.log(`\nDRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`)
    return
  }

  const tx = client.transaction()
  for (const c of changes) {
    tx.patch(c._id, (p) => p.set({ to: c.nextTo }))
  }
  await tx.commit()
  console.log(`\n✅  Patched ${changes.length} redirect(s) on ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
