/**
 * Structure-resolve smoke test (PROD-2284 regression guard).
 *
 * The desk structure (`structure/index.ts`) resolves in the BROWSER, not at
 * build time — so `sanity build` / `sanity schema extract` pass even when a pane
 * references a document type that no longer exists, and the Studio then throws at
 * runtime ("Schema type with name \"industry\" not found"). This static check
 * closes that gap: every type named in a `documentTypeList('X')` or
 * `schemaType('X')` call must be defined by some `defineType({ name: 'X' })` in
 * the schema. Runs offline (no Sanity CLI, no env, no dataset).
 *
 * Wired as `pnpm --filter @pakfactory/studio check:structure-types` and run in CI
 * whenever apps/studio changes. Add it after any type add/remove/rename.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const studioRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// 1. Every type name defined anywhere in the schema (schemas/** + lib/**).
//    `name:` is the first property of defineType, so there is no `}` before it.
const defined = new Set()
function collect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) collect(p)
    else if (entry.name.endsWith('.ts')) {
      const src = readFileSync(p, 'utf8')
      for (const m of src.matchAll(/defineType\(\s*\{[^}]*?name:\s*['"]([a-zA-Z0-9_]+)['"]/gs)) {
        defined.add(m[1])
      }
    }
  }
}
for (const d of ['schemas', 'lib']) collect(join(studioRoot, d))

// 2. Every type referenced by the desk structure (handles multi-line calls).
const structPath = join(studioRoot, 'structure', 'index.ts')
const structSrc = readFileSync(structPath, 'utf8')
const refs = new Map() // name -> first line seen
const refRe = /(?:documentTypeList|schemaType)\(\s*['"]([a-zA-Z0-9_]+)['"]/g
for (let m; (m = refRe.exec(structSrc)); ) {
  if (!refs.has(m[1])) refs.set(m[1], structSrc.slice(0, m.index).split('\n').length)
}

// 3. Any referenced type that is not defined is a dangling pane.
const dangling = [...refs].filter(([name]) => !defined.has(name))
if (dangling.length) {
  console.error(`✖ structure/index.ts references ${dangling.length} type(s) with no defineType in the schema:`)
  for (const [name, line] of dangling) console.error(`  - "${name}"  (structure/index.ts:${line})`)
  console.error(
    '\nThe desk structure resolves at RUNTIME — `sanity build` will NOT catch this.\n' +
      'Remove/repoint the pane, or restore the type. (PROD-2284 shipped this exact bug.)',
  )
  process.exit(1)
}
console.log(
  `✓ structure-types: all ${refs.size} desk-structure type refs resolve against ${defined.size} defined schema types.`,
)
