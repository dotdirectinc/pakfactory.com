/**
 * Strip trailing slashes from existing `redirect` docs' `from` / `to` paths.
 *
 * The site canonicalizes to NO trailing slash (blog `proxy.ts` 308-redirects
 * `/x/` → `/x`), so any stored trailing slash is redundant. The proxy already
 * normalizes at request time, so this is DATA HYGIENE ONLY — redirects resolve
 * correctly with or without it. Run it to make the records read canonical.
 *
 * From repo root (DRY-RUN is the default — it only prints; nothing is written):
 *   pnpm --filter @pakfactory/studio run migrate:redirect-slashes
 *   pnpm --filter @pakfactory/studio run migrate:redirect-slashes -- --apply
 *
 * Target the right dataset via env (defaults below). Redirects live in the
 * shared `production` dataset:
 *   NEXT_PUBLIC_SANITY_DATASET=production pnpm --filter @pakfactory/studio run migrate:redirect-slashes -- --apply
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token is not enough for --apply.
 *
 * Notes:
 * - Processes published docs. If a redirect also has an open DRAFT, republish it
 *   in Studio afterward (or discard the draft) so the draft doesn't reintroduce
 *   the slash — drafts are reported, not written.
 * - Collision guard: if stripping a `from` would duplicate another redirect's
 *   `from` (e.g. `/x/` and `/x` both exist), BOTH are left untouched and flagged
 *   for manual resolution — `from` must stay unique.
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

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'production'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --apply needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot patch.')
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

  const changes = []
  for (const d of docs) {
    const nextFrom = stripTrailingSlash(d.from)
    const nextTo = stripTrailingSlash(d.to)
    if (nextFrom !== d.from || nextTo !== d.to) {
      changes.push({ _id: d._id, from: d.from, to: d.to, nextFrom, nextTo })
    }
  }

  if (changes.length === 0) {
    console.log('✅  Nothing to change — all redirect paths are already slashless.\n')
    return
  }

  // Uniqueness guard: a stripped `from` must not collide with any other redirect's
  // final `from` (its stripped value if it's changing, else its current value).
  const finalFromById = new Map(docs.map((d) => [d._id, stripTrailingSlash(d.from)]))
  const collisions = new Set()
  const seen = new Map()
  for (const [id, from] of finalFromById) {
    if (seen.has(from)) {
      collisions.add(id)
      collisions.add(seen.get(from))
    } else {
      seen.set(from, id)
    }
  }

  let willWrite = 0
  for (const c of changes) {
    const blocked = collisions.has(c._id)
    const mark = blocked ? '⛔' : apply ? '✏️ ' : '•'
    console.log(`${mark} ${c._id}`)
    if (c.nextFrom !== c.from) console.log(`     from: ${c.from}  →  ${c.nextFrom}`)
    if (c.nextTo !== c.to) console.log(`     to:   ${c.to}  →  ${c.nextTo}`)
    if (blocked) console.log(`     ⛔ skipped — stripped "from" collides with another redirect; resolve by hand`)
    else willWrite++
  }

  if (draftIds.length) {
    console.log(`\n⚠️  ${draftIds.length} redirect(s) have open DRAFTS — republish/discard them after this run so drafts don't reintroduce a slash:`)
    draftIds.forEach((id) => console.log(`     ${id}`))
  }

  console.log(`\n${changes.length} doc(s) with trailing slashes · ${willWrite} writable · ${collisions.size} blocked by collision`)

  if (!apply) {
    console.log(`\nDRY-RUN only — re-run with \`-- --apply\` to write.\n`)
    return
  }

  const tx = client.transaction()
  let n = 0
  for (const c of changes) {
    if (collisions.has(c._id)) continue
    const patch = {}
    if (c.nextFrom !== c.from) patch.from = c.nextFrom
    if (c.nextTo !== c.to) patch.to = c.nextTo
    tx.patch(c._id, (p) => p.set(patch))
    n++
  }
  if (n === 0) {
    console.log(`\nNothing writable (all blocked by collisions). Resolve collisions and re-run.\n`)
    return
  }
  await tx.commit()
  console.log(`\n✅  Patched ${n} redirect(s) on ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
