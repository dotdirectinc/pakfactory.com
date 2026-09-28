/**
 * The migration ledger — one `migrationRun` document per migration, PER DATASET.
 *
 * ── Why the ledger lives in the dataset and not in git ──────────────────────────
 *
 * "Has this migration run against production?" is a fact about the DATASET, not about
 * the repository. Git holds the same commit for everyone; `development` and
 * `production` have had different things applied to them, and only the dataset itself
 * can say which. A file in git would be a claim about a remote system, kept by hand,
 * and would be wrong the first time someone ran a script without editing it.
 *
 * Two consequences fall out of this placement, and both are correct:
 *
 *   - A restore from backup rolls the ledger back together with the data it describes.
 *   - `sanity:sync-prod-to-dev` carries production's ledger into development, which is
 *     exactly right: after that sync, development HAS had those migrations applied.
 *
 * ── `adopted` — the difference between "we ran it" and "we found it done" ────────
 *
 * Most of what production has had applied was run before this runner existed. Those
 * rows are written by `migrate adopt`, from each migration's own probe, and carry
 * `adopted: true`. A row written by an actual run carries `adopted: false` and a `log`.
 * Collapsing the two would make the ledger claim provenance it does not have.
 */

/** Deterministic id, so a second write updates the row instead of duplicating it. */
export const ledgerId = (migrationId) => `migration.${migrationId}`

export const LEDGER_TYPE = 'migrationRun'

/**
 * Every ledger row for a dataset, keyed by migrationId.
 * @returns {Promise<Map<string, object>>}
 */
export async function readLedger(client) {
  const rows = await client.fetch(
    `*[_type == $type]{ migrationId, ticket, title, ranAt, ranBy, gitSha, checksum, scriptPath, command, docsTouched, adopted, log }`,
    { type: LEDGER_TYPE },
  )
  return new Map(rows.map((r) => [r.migrationId, r]))
}

/**
 * Record a migration as applied to this dataset.
 *
 * `createOrReplace` rather than `create`: a re-run of an idempotent migration should
 * update its row (new timestamp, new log) rather than fail on a duplicate id.
 */
export async function writeLedgerEntry(client, entry) {
  const {
    migrationId,
    ticket = null,
    title = null,
    checksum = null,
    scriptPath = null,
    command = null,
    docsTouched = null,
    adopted = false,
    log = null,
    ranBy = null,
    gitSha = null,
  } = entry

  return client.createOrReplace({
    _id: ledgerId(migrationId),
    _type: LEDGER_TYPE,
    migrationId,
    ticket,
    title,
    ranAt: new Date().toISOString(),
    ranBy,
    gitSha,
    checksum,
    scriptPath,
    command,
    docsTouched,
    adopted,
    // Trimmed, because a ledger row is a record and not a log server. The tail is what
    // matters: it is where a script prints what it discarded. `unset-verified-deprecations`
    // says of its deliberate-loss printout "the printed list is the record" — today that
    // record is terminal scrollback, and this is where it stops being.
    log: log ? tail(log, 16_000) : null,
  })
}

function tail(text, max) {
  if (text.length <= max) return text
  return `…[${text.length - max} earlier characters omitted]…\n${text.slice(-max)}`
}
