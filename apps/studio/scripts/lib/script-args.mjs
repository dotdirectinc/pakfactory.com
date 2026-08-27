/**
 * Argument parsing for the `apps/studio/scripts/*.mjs` dataset tools.
 *
 * This implements the migration-script convention already established in
 * `packages/sanity/scripts/` — 12 of the 15 scripts there use it (see
 * `migrate-product-style-line.ts`, `migrate-rename-commercial-types.ts`,
 * `migrate-unset-legacy-applies.ts`, …):
 *
 *   --dataset <name>    REQUIRED, always. There is no environment fallback.
 *   --confirm           actually write. Without it every run is a dry run.
 *   --yes-production    second gate. A write to `production` is refused without it.
 *
 * `apps/studio/scripts/` had drifted to env-var-only invocation, and three scripts
 * written in Aug 2026 (backfill-customization-option-role, split-coating-customization-type,
 * migrate-customization-availability-axes) copied that local habit instead of the
 * convention one directory over. This module is the correction; new Studio dataset
 * scripts should import it rather than re-roll `process.argv.includes`.
 *
 * Why `--dataset` is required rather than defaulted — the bug that prompted this:
 * on 2026-08-27, `pnpm run migrate:availability-axes -- --dataset production --confirm`
 * was parsed as `argv.includes('--apply')` and nothing else. The flag was dropped, the
 * dataset fell back to a `development` default, and the run printed
 * "dataset=development mode=APPLY (writes)" then "Nothing to do — already migrated."
 * That reads as success. Production was untouched and nothing said so.
 *
 * Hence three rules, in order of importance:
 *   1. An unrecognised argument is an ERROR, never a shrug. Ignoring a typo'd flag has
 *      exactly one failure mode — a write aimed at the wrong dataset that reports
 *      success.
 *   2. `--dataset` is required even for a dry run. An ambient default is what turned a
 *      dropped flag into a silent no-op; removing the default removes the class.
 *   3. Production needs `--yes-production` on top of `--confirm`. Two gates, because
 *      `production` is one keystroke from `development` in shell history.
 *
 * `pnpm run x -- --flag` forwards a literal `--` in argv; it is skipped.
 */

function fail(msg, usage) {
  console.error(`\n✖ ${msg}\n`)
  if (usage) console.error(`${usage}\n`)
  process.exit(1)
}

/**
 * @param {object}   opts
 * @param {string[]} [opts.flags]  extra boolean flags beyond --confirm / --yes-production
 * @param {string}   [opts.usage]  usage text printed on an argument error
 * @param {string[]} [opts.argv]   defaults to process.argv.slice(2)
 * @returns {{ dataset: string, confirm: boolean, yesProduction: boolean } & Record<string, boolean>}
 */
export function parseScriptArgs({ flags = [], usage, argv = process.argv.slice(2) } = {}) {
  const booleans = new Set(['confirm', 'yes-production', ...flags])
  const out = { dataset: undefined }
  for (const f of booleans) out[camel(f)] = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--') continue // pnpm forwards this verbatim
    if (!arg.startsWith('--')) {
      fail(`Unexpected argument \`${arg}\` — these scripts take flags only.`, usage)
    }
    const eq = arg.indexOf('=')
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq)
    const inline = eq === -1 ? undefined : arg.slice(eq + 1)

    if (name === 'dataset') {
      const value = inline ?? argv[++i]
      if (!value || value.startsWith('--')) {
        fail('`--dataset` needs a value, e.g. `--dataset production`.', usage)
      }
      out.dataset = value
      continue
    }
    // `--apply` was the spelling three Studio scripts shipped with in Aug 2026 before
    // this convention was adopted. Accepted so anything already written down keeps
    // working; `--confirm` is the name to use.
    if (name === 'apply') {
      console.warn('⚠️  `--apply` is the old spelling — use `--confirm`, matching packages/sanity/scripts.')
      out.confirm = true
      continue
    }
    if (booleans.has(name)) {
      if (inline !== undefined) fail(`\`--${name}\` is a switch and takes no value.`, usage)
      out[camel(name)] = true
      continue
    }
    fail(
      `Unknown flag \`${arg}\`. Known flags: --dataset <name>, ${[...booleans].map((f) => `--${f}`).join(', ')}.`,
      usage,
    )
  }

  if (!out.dataset) {
    fail(
      '`--dataset` is required — name the target explicitly, e.g. `--dataset development`.\n' +
        '  There is deliberately no environment fallback: an ambient default is what let a\n' +
        '  dropped flag write to the wrong dataset and report success.',
      usage,
    )
  }
  if (out.dataset === 'production' && out.confirm && !out.yesProduction) {
    fail('Refusing to write to production without --yes-production.', usage)
  }
  return out
}

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

/** Human-readable run mode for the banner. */
export function describeMode({ confirm, dataset }) {
  return confirm ? `CONFIRM (writes to ${dataset})` : 'DRY-RUN (no writes)'
}
