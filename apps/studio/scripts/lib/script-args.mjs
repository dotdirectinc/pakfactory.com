/**
 * Argument parsing for the `apps/studio/scripts/*.mjs` dataset tools.
 *
 * Written after a real miss on 2026-08-27: the scripts took their dataset from
 * `NEXT_PUBLIC_SANITY_DATASET` only, so
 *
 *   pnpm run migrate:availability-axes -- --dataset production --apply
 *
 * — the obvious thing to type — silently ignored `--dataset`, fell back to the
 * `development` default, and printed a confident "Nothing to do — development is
 * already migrated." The run looked like a success. Production was untouched.
 *
 * Two rules follow from that, and both matter more than the flag itself:
 *
 *   1. An unrecognised argument is an ERROR, never a shrug. A typo'd or unsupported
 *      flag must stop the run, because the failure mode of ignoring it is a write to
 *      the wrong dataset that reports success.
 *   2. `--apply` must not accept a DEFAULTED dataset. Writing requires the dataset to
 *      be named — by `--dataset` or by the environment — so "I meant production" can
 *      never quietly become "it wrote development".
 *
 * `pnpm run x -- --flag` forwards a literal `--` in argv; it is skipped.
 */

/** @param {string} msg */
function fail(msg, usage) {
  console.error(`❌  ${msg}`)
  if (usage) console.error(`\n${usage}`)
  process.exit(1)
}

/**
 * @param {object}   opts
 * @param {string[]} [opts.flags]   extra boolean flag names beyond `--apply`
 * @param {string}   [opts.usage]   usage text printed on an argument error
 * @param {string[]} [opts.argv]    defaults to process.argv.slice(2)
 * @returns {{ apply: boolean, dataset: string|undefined, datasetWasExplicit: boolean } & Record<string, boolean>}
 */
export function parseScriptArgs({ flags = [], usage, argv = process.argv.slice(2) } = {}) {
  const booleans = new Set(['apply', ...flags])
  /** @type {Record<string, unknown>} */
  const out = { dataset: undefined, datasetWasExplicit: false }
  for (const f of booleans) out[f] = false

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
      out.datasetWasExplicit = true
      continue
    }
    if (booleans.has(name)) {
      if (inline !== undefined) fail(`\`--${name}\` is a switch and takes no value.`, usage)
      out[name] = true
      continue
    }
    fail(
      `Unknown flag \`${arg}\`. Known flags: --dataset <name>, ${[...booleans].map((f) => `--${f}`).join(', ')}.`,
      usage,
    )
  }
  return /** @type {any} */ (out)
}

/**
 * Resolve the dataset from the flag, then the environment.
 *
 * `--apply` requires the EXPLICIT flag — an env value is not enough. `.env.local` is
 * ambient: it is loaded from three files, survives between sessions, and is exactly
 * what nobody re-reads before typing `--apply`. A dry run may lean on it; a write must
 * name its target on the command line, where it is visible in shell history next to
 * the thing it did.
 *
 * @returns {string}
 */
export function resolveDataset({ dataset, datasetWasExplicit, apply }, usage) {
  if (apply && !datasetWasExplicit) {
    fail(
      '`--apply` writes, so the dataset must be named on the command line: add `--dataset production` or `--dataset development`.\n' +
        '   NEXT_PUBLIC_SANITY_DATASET is deliberately NOT enough for a write — it is ambient and easy to be wrong about.',
      usage,
    )
  }
  return (
    dataset ||
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    process.env.SANITY_STUDIO_DATASET ||
    'development'
  )
}
