/**
 * Delete the catalog — products and customizations — so it can be repopulated from source.
 *
 * Policy (Richard, 2026-09-23): **Notion and the Miro board are the only sources of truth.**
 * Nothing in a Sanity dataset is to be treated as up to date. Rather than patch documents of
 * unknown age in place, the catalog is removed and rebuilt from those two sources, so every
 * document that survives has a known provenance.
 *
 * ── SCOPE ────────────────────────────────────────────────────────────────────────
 *
 * Products and customizations ONLY. Blog, case studies, www pages, redirects, navigation,
 * settings and the migration ledger are NOT touched and are not this script's business.
 *
 *   product · productLine · productStyle · solution
 *   customizationOption · customizationType
 *   property · propertyValue
 *
 * ── WHAT IT REFUSES TO DELETE, AND WHY ───────────────────────────────────────────
 *
 * `customizationCategory` is in the catalog but is deliberately EXCLUDED. The catalog fill
 * never creates categories — `pakfactory.com-backend/scripts/sanity-fill.mjs` hard-exits with
 * "customizationCategory ... is not in sanity.json — the fill never creates categories." So
 * deleting the four category documents does not clear the way for a rebuild, it makes the
 * rebuild impossible. They are the one part of the catalog that must outlive the purge.
 *
 * Pass --with-categories to override, and read that sentence again first.
 *
 * ── STRONG REFERENCES FROM OUTSIDE THE SCOPE ─────────────────────────────────────
 *
 * Case studies and client documents reference customization options and products. Those
 * references are NOT regenerated from Notion — that content is Sanity-native — so a delete
 * either fails (a strong reference blocks it) or leaves the referrer pointing at nothing.
 *
 * This script does not guess. It counts them first, prints every referrer, and REFUSES to
 * write unless --accept-dangling says you have read the list. The rebuild cannot repair
 * them; a person re-points them afterwards.
 *
 * Sanity has no force-delete: a STRONG reference from outside blocks the delete outright.
 * --detach-referrers clears the way. It walks each referrer (drafts included) for the exact
 * reference paths that point into the delete set, records every one — referrer, path, old
 * target, its title — in the --emit-map file, and only then unsets those paths and nothing
 * else. It re-checks that no external reference remains before deleting anything. The map
 * is what the post-rebuild re-point step reads to put each reference back.
 *
 * ── ORDER ────────────────────────────────────────────────────────────────────────
 *
 * Everything in scope goes in one transaction per chunk, so references BETWEEN scoped
 * documents disappear together rather than blocking each other. Drafts are included: a
 * draft of a deleted document is not a document anyone wants left behind.
 *
 * From repo root (DRY RUN is the default — prints only, writes nothing):
 *   pnpm --filter @pakfactory/studio run purge:catalog -- --dataset development
 *   pnpm --filter @pakfactory/studio run purge:catalog -- --dataset development --emit-map <file> --confirm --accept-dangling --detach-referrers
 *   pnpm --filter @pakfactory/studio run purge:catalog -- --dataset production --emit-map <file> --confirm --accept-dangling --detach-referrers --yes-production
 *
 * Requires a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN). A read token cannot --confirm.
 *
 * ⚠️  Take a dataset export first. This is not reversible from inside Sanity:
 *     npx sanity@latest dataset export <dataset> <file>.tar.gz -p 8293wrxp
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run purge:catalog -- --dataset <development|production> [--confirm] [--accept-dangling] [--yes-production]

  --dataset          REQUIRED. Which dataset to read/write. No env fallback.
  --confirm          Actually delete. Without it the run is a dry run.
  --accept-dangling  Required to --confirm when documents OUTSIDE the catalog reference it.
  --emit-map <path>  Write the id → type+title map and every external referrer to <path>.
                     REQUIRED to --confirm when anything outside the catalog references it:
                     the rebuild recreates these documents under the SAME titles but NEW
                     ids, so this file is what lets the references be repaired afterwards.
  --detach-referrers Unset the references outside documents hold into the catalog, so the
                     delete is not blocked. Every unset path is recorded in --emit-map first.
                     Required to --confirm when any of those references is STRONG.
  --with-categories  Also delete customizationCategory. The rebuild cannot recreate these.
  --yes-production   Second gate; required to write to production.`

const args = parseScriptArgs({
  flags: ['accept-dangling', 'detach-referrers', 'with-categories'],
  values: ['emit-map'],
  usage: USAGE,
})
const { confirm: apply, acceptDangling, detachReferrers, withCategories, yesProduction, emitMap } = args

/** The catalog, minus the one type the rebuild cannot recreate (see the header). */
const SCOPE = [
  'product',
  'productLine',
  'productStyle',
  'solution',
  'customizationOption',
  'customizationType',
  'property',
  'propertyValue',
]
if (withCategories) SCOPE.push('customizationCategory')

/**
 * Where the repair key is NOT the title, because Notion's model differs from the one
 * Sanity currently holds. Verified against the 2026-09-23 Notion pull; every successor
 * below carries Status `Copies Done` or `New`, so the rebuild creates all of them.
 *
 * The three embossing rows are a MODEL CHANGE, not a rename: Sanity merged embossing and
 * debossing into one option per registration type, Notion keeps them apart. A case study
 * citing the merged option has to become one or the other (or both), and only its copy can
 * say which — so those are emitted as a choice for a person, never auto-resolved.
 */
const ALIASES = {
  'Aqueous Coating': ['AQ Coating (Aqueous)'],
  'Soft Touch Lamination': ['Soft Touch/Velvet Lamination'],
  'Internal PE Coating': ['Internal PE Lining'],
  'Registered Embossing & Debossing': ['Registered Embossing', 'Registered Debossing'],
  'Blind Embossing & Debossing': ['Blind Embossing', 'Blind Debossing'],
  'Combination Embossing & Debossing': ['Combination Embossing', 'Combination Debossing'],
}

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
  console.error('❌  --confirm needs a WRITE token; only a read token is set.')
  process.exit(1)
}
if (apply && DATASET === 'production' && !yesProduction) {
  console.error('❌  Refusing to delete from production without --yes-production.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-10-01',
  useCdn: false,
})

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * Every reference in `doc` that points into `targets`, as Sanity patch paths, in document
 * order. Array items are addressed by `_key` where they have one (stable under reorder) and
 * by index otherwise. System keys (`_id`, `_rev`, …) are skipped.
 */
function findRefPaths(doc, targets) {
  const out = []
  const walk = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        const key = item && typeof item === 'object' && typeof item._key === 'string' ? item._key : null
        walk(item, key ? `${path}[_key==${JSON.stringify(key)}]` : `${path}[${i}]`)
      })
      return
    }
    if (!value || typeof value !== 'object') return
    if (typeof value._ref === 'string') {
      if (targets.has(value._ref)) out.push({ path, ref: value._ref, weak: value._weak === true })
      return
    }
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('_')) continue
      walk(v, path ? `${path}.${k}` : k)
    }
  }
  walk(doc, '')
  return out
}

async function main() {
  console.log(`\n🗑  Purge catalog — ${describeMode({ confirm: apply, dataset: DATASET })}`)
  console.log(`   project ${PROJECT_ID} · dataset=${DATASET}`)
  console.log(`   scope: ${SCOPE.join(', ')}`)
  if (!withCategories) console.log('   keeping: customizationCategory (the rebuild cannot recreate it)')

  // ── 1. What is in scope, drafts included ─────────────────────────────────────
  const docs = await client.fetch(
    `*[_type in $scope]{_id, _type, title} | order(_type asc, _id asc)`,
    { scope: SCOPE },
  )
  const byType = {}
  for (const d of docs) byType[d._type] = (byType[d._type] ?? 0) + 1

  console.log(`\n   ${plural(docs.length, 'document')} in scope (drafts included):`)
  for (const t of SCOPE) if (byType[t]) console.log(`     ${String(byType[t]).padStart(5)}  ${t}`)

  if (!docs.length) {
    // Rule 3 of dataset-script-placement-and-flags: never say "nothing to do" without
    // naming the target — the phrase is also what a wrong dataset looks like.
    console.log(`\n✅  Nothing to delete in dataset=${DATASET}.`)
    return
  }

  // ── 2. Who outside the catalog is pointing at it ─────────────────────────────
  // Ask each scoped document who references it from outside the scope.
  const dangling = await client.fetch(
    `*[_type in $scope]{
       _id, _type, title,
       "from": *[!(_type in $scope) && references(^._id)]{_id, _type, title}
     }[count(from) > 0]`,
    { scope: SCOPE },
  )

  if (dangling.length) {
    const total = dangling.reduce((n, d) => n + d.from.length, 0)
    console.log(
      `\n⚠️  ${plural(dangling.length, 'catalog document')} referenced by ${plural(total, 'document')} OUTSIDE the scope.`,
    )
    console.log('   These referrers are not regenerated from Notion. After the rebuild they')
    console.log('   point at documents that no longer exist, and a person must re-point them.\n')
    const byReferrerType = {}
    for (const d of dangling) for (const f of d.from) byReferrerType[f._type] = (byReferrerType[f._type] ?? 0) + 1
    for (const [t, n] of Object.entries(byReferrerType).sort((a, b) => b[1] - a[1])) {
      console.log(`     ${String(n).padStart(5)}  reference(s) from ${t}`)
    }
    console.log('')
    for (const d of dangling.slice(0, 40)) {
      console.log(`     ${d._type} "${d.title ?? d._id}"`)
      for (const f of d.from.slice(0, 6)) console.log(`         ← ${f._type} "${f.title ?? f._id}"`)
      if (d.from.length > 6) console.log(`         … and ${d.from.length - 6} more`)
    }
    if (dangling.length > 40) console.log(`     … and ${dangling.length - 40} more catalog documents`)
  } else {
    console.log('\n   No documents outside the catalog reference it.')
  }

  // ── 2b. The exact paths a detach would unset ─────────────────────────────────
  // Planned in the dry run too, so the map shows what --detach-referrers will touch.
  const targetIds = new Set(docs.map((d) => d._id))
  const targetById = new Map(docs.map((d) => [d._id, d]))
  const referrerIds = [...new Set(dangling.flatMap((d) => d.from.map((f) => f._id)))]
  const referrers = referrerIds.length
    ? await client.fetch(`*[_id in $ids]`, { ids: referrerIds })
    : []
  const detachPlan = referrers.map((doc) => ({ doc, refs: findRefPaths(doc, targetIds) }))

  // Every (referrer, target) pair the reference query reported must have a path in the
  // walk. A miss means the walk cannot see a shape it should; unsetting would leave the
  // reference in place and the delete would fail half-way, so stop here instead.
  const missing = []
  for (const d of dangling) {
    for (const f of d.from) {
      const plan = detachPlan.find((p) => p.doc._id === f._id)
      if (!plan?.refs.some((r) => r.ref === d._id)) missing.push(`${f._type} ${f._id} → ${d._id}`)
    }
  }
  if (missing.length) {
    console.error(`\n❌  ${plural(missing.length, 'reference')} could not be located inside the referrer:`)
    for (const m of missing.slice(0, 20)) console.error(`     ${m}`)
    console.error('    The detach walk does not understand these shapes. Nothing was written.')
    process.exit(1)
  }
  const detachRows = detachPlan.flatMap(({ doc, refs }) =>
    refs.map((r) => ({
      referrer: { _id: doc._id, _type: doc._type, title: doc.title ?? doc.name ?? null },
      path: r.path,
      weak: r.weak,
      target: {
        _id: r.ref,
        _type: targetById.get(r.ref)?._type ?? null,
        title: targetById.get(r.ref)?.title ?? null,
      },
    })),
  )
  const strongCount = detachRows.filter((r) => !r.weak).length
  if (detachRows.length) {
    console.log(
      `\n   Detach plan: ${plural(detachRows.length, 'reference path')} in ${plural(referrers.length, 'referrer')} `
        + `(${strongCount} strong — these block the delete, ${detachRows.length - strongCount} weak).`,
    )
  }

  // ── 3. Capture what repair will need, BEFORE anything is deleted ─────────────
  // The rebuild recreates these under the same titles with new ids, so title is the
  // repair key. It only exists while the documents do.
  if (emitMap) {
    const map = {
      about: 'Written by purge-catalog.mjs BEFORE deletion. Repair key is (_type, title): the '
        + 'rebuild recreates these under the same titles with NEW ids. Use it to re-point the '
        + 'referrers listed here once the catalog fill has been uploaded.',
      dataset: DATASET,
      projectId: PROJECT_ID,
      takenAt: new Date().toISOString(),
      scope: SCOPE,
      deleted: docs.map((d) => ({ _id: d._id, _type: d._type, title: d.title ?? null })),
      referrers: dangling.map((d) => {
        const alias = ALIASES[d.title ?? '']
        return {
          _id: d._id,
          _type: d._type,
          title: d.title ?? null,
          // How to find the replacement after the rebuild. `title` means the successor
          // carries the same title; `alias` names it; `choice` means a person picks.
          repairBy: !alias ? 'title' : alias.length === 1 ? 'alias' : 'choice',
          successors: alias ?? [d.title ?? null],
          referencedBy: d.from.map((f) => ({ _id: f._id, _type: f._type, title: f.title ?? null })),
        }
      }),
      // One row per reference path --detach-referrers unsets: the re-point step writes a
      // reference to the successor back at `path` on `referrer._id`.
      detached: detachRows,
    }
    const choices = map.referrers.filter((r) => r.repairBy === 'choice')
    if (choices.length) {
      map.about += ` ${choices.length} entr${choices.length === 1 ? 'y needs' : 'ies need'} a human `
        + 'choice (repairBy: "choice") — Notion splits embossing from debossing, so only the '
        + "referrer's own copy can say which successor it meant."
    }
    writeFileSync(resolvePath(emitMap), `${JSON.stringify(map, null, 2)}\n`)
    const counts = map.referrers.reduce((a, r) => ({ ...a, [r.repairBy]: (a[r.repairBy] ?? 0) + 1 }), {})
    const refs = (k) => map.referrers.filter((r) => r.repairBy === k).reduce((n, r) => n + r.referencedBy.length, 0)
    console.log(`\n   wrote the repair map to ${resolvePath(emitMap)}`)
    console.log(`     ${plural(map.deleted.length, 'document')}, ${map.referrers.length} of them referenced from outside`)
    if (counts.title) console.log(`     ${counts.title} repair by title  (${plural(refs('title'), 'reference')}) — the rebuild recreates the same title`)
    if (counts.alias) console.log(`     ${counts.alias} repair by alias  (${plural(refs('alias'), 'reference')}) — renamed in Notion, successor named in the map`)
    if (counts.choice) console.log(`     ${counts.choice} need a CHOICE   (${plural(refs('choice'), 'reference')}) — Notion splits these in two; a person picks`)
    if (detachRows.length) console.log(`     ${plural(detachRows.length, 'reference path')} recorded for --detach-referrers`)
  }

  // ── 4. Write, or explain why not ─────────────────────────────────────────────
  if (!apply) {
    console.log(`\n🔍  DRY RUN — nothing deleted from dataset=${DATASET}.`)
    console.log(`    Re-run with --confirm${dangling.length ? ' --accept-dangling' : ''}${strongCount ? ' --detach-referrers' : ''}${DATASET === 'production' ? ' --yes-production' : ''} to delete.`)
    return
  }
  if (dangling.length && !acceptDangling) {
    console.error(
      `\n❌  ${plural(dangling.length, 'catalog document')} are referenced from outside the catalog.`,
    )
    console.error('    Read the list above, then pass --accept-dangling to proceed anyway.')
    process.exit(1)
  }
  // The map is the ONLY record of which old id each referrer pointed at, and it stops
  // existing the moment these documents do. Refusing here is the difference between a
  // repairable rebuild and a hand-audit of every case study.
  if (dangling.length && !emitMap) {
    console.error('\n❌  Documents outside the catalog reference it, and no --emit-map was given.')
    console.error('    Deleting now destroys the only record of what pointed where.')
    console.error('    Re-run with --emit-map <path> so the references can be repaired afterwards.')
    process.exit(1)
  }
  // Sanity has no force-delete: a strong reference from outside fails the chunk holding
  // its target. Known in advance, so refuse before writing rather than part-way through.
  if (strongCount && !detachReferrers) {
    console.error(`\n❌  ${plural(strongCount, 'strong reference')} from outside the catalog will block the delete.`)
    console.error('    Re-run with --detach-referrers to unset them (every path is in the map first).')
    process.exit(1)
  }

  // ── 5. Detach the referrers ──────────────────────────────────────────────────
  // The map was written above, so every path unset here is already on disk. One
  // transaction for all referrers: either every reference is detached or none is.
  // Paths go in REVERSE document order, so removing an array item by index never shifts
  // an index still to be removed. The first patch per document pins its revision, so an
  // edit made since the fetch fails the whole transaction instead of being overwritten.
  if (detachReferrers && detachRows.length) {
    let tx = client.transaction()
    for (const { doc, refs } of detachPlan) {
      refs.slice().reverse().forEach((r, i) => {
        tx = tx.patch(doc._id, (p) => {
          const patch = p.unset([r.path])
          return i === 0 ? patch.ifRevisionId(doc._rev) : patch
        })
      })
    }
    try {
      await tx.commit({ visibility: 'sync' })
    } catch (err) {
      console.error(`\n❌  Detach failed: ${err.message}`)
      console.error('    Nothing was detached and nothing was deleted (one transaction).')
      process.exit(1)
    }
    console.log(`\n   detached ${plural(detachRows.length, 'reference path')} from ${plural(detachPlan.length, 'referrer')}`)

    const left = await client.fetch(
      `*[!(_type in $scope) && references($ids)]{_id, _type}`,
      { scope: SCOPE, ids: [...targetIds] },
    )
    if (left.length) {
      console.error(`\n❌  ${plural(left.length, 'document')} outside the catalog still reference it after the detach:`)
      for (const l of left.slice(0, 20)) console.error(`     ${l._type} ${l._id}`)
      console.error('    Refusing to delete. The detach above IS applied; its paths are in the map.')
      process.exit(1)
    }
    console.log('   re-checked: no document outside the catalog references it')
  }

  // One transaction per chunk: references BETWEEN scoped documents vanish together, so
  // they cannot block one another. A strong reference from OUTSIDE still can — that is
  // what the list above is warning about, and the error names the document.
  const ids = docs.map((d) => d._id)
  const CHUNK = 100
  let deleted = 0
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    const tx = slice.reduce((t, id) => t.delete(id), client.transaction())
    try {
      await tx.commit({ visibility: 'async' })
      deleted += slice.length
      process.stdout.write(`\r   deleted ${deleted}/${ids.length}`)
    } catch (err) {
      console.error(`\n❌  Chunk ${i / CHUNK + 1} failed: ${err.message}`)
      console.error(
        deleted
          ? `    Nothing in that chunk was deleted. The ${plural(deleted, 'document')} in earlier chunks are already gone.`
          : '    Nothing was deleted — this was the first chunk.',
      )
      if (detachReferrers && detachRows.length) {
        console.error('    The referrers WERE detached; the map holds every unset path.')
      }
      process.exit(1)
    }
  }
  console.log(`\n\n✅  Deleted ${plural(deleted, 'document')} from dataset=${DATASET}.`)
  console.log('    Next: re-pull sanity.json and regenerate the catalog review set —')
  console.log('    the existing set was planned against the dataset as it was BEFORE this.')
}

main().catch((err) => {
  console.error(`\n❌  ${err.message}`)
  process.exit(1)
})
