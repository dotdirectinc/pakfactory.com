#!/usr/bin/env node
/**
 * The Sanity migration runner — one command that knows what has run where.
 *
 *   pnpm sanity:migrate status --dataset production
 *   pnpm sanity:migrate up     --dataset production                            # dry run
 *   pnpm sanity:migrate up     --dataset production --confirm --yes-production
 *   pnpm sanity:migrate up     --dataset production --only 20260917-unset-verified-deprecations
 *   pnpm sanity:migrate adopt  --dataset production --confirm --yes-production
 *
 * ── What problem this solves ────────────────────────────────────────────────────
 *
 * Before this existed, "which migrations still need to run against production?" was
 * answered by reading 60-odd scripts and writing GROQ probes by hand, once per asking.
 * It was answered that way on 2026-09-22 and the answer was still incomplete: the sweep
 * checked the fields the current release touched and missed PROD-2199, whose 171 stale
 * documents had been sitting in production since July. The register is what makes the
 * question cheap enough to ask every time.
 *
 * ── The safety properties, all inherited deliberately ───────────────────────────
 *
 * `--dataset` is required with NO environment fallback; a dry run is the default; a
 * write to production needs `--yes-production` on top of `--confirm`; an unrecognised
 * argument is a hard exit. Those are `.claude/rules/dataset-script-placement-and-flags.md`,
 * and they are here for the same reason they are in the scripts this drives — BUG-0032
 * was a production migration that reported success while pointed at development.
 *
 * The runner adds three of its own:
 *
 *   1. It REFUSES to execute a `legacy-env` script. Those resolve their own dataset from
 *      NEXT_PUBLIC_SANITY_DATASET, so the runner cannot honour `--dataset` on their
 *      behalf — and quietly setting that variable for them would rebuild the exact
 *      ambient default the rule removed.
 *   2. It re-runs each migration's probe AFTER a confirmed run. A script that exits 0
 *      while its own probe still reads "pending" is reported as a failure, not a tick.
 *      An exit code is a claim about a process; the probe is a fact about the dataset.
 *   3. It refuses a migration whose `after:` dependencies have not been applied.
 */

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parseScriptArgs } from '../../apps/studio/scripts/lib/script-args.mjs'
import { makeClient, repoRoot, PROJECT_ID } from './lib/client.mjs'
import { readLedger, writeLedgerEntry } from './lib/ledger.mjs'
import { MIGRATIONS, HISTORIC, TASKS, byId } from './migrations.manifest.mjs'

const USAGE = `Usage:
  pnpm sanity:migrate <status|up|adopt> --dataset <development|production> [flags]

  status   List every migration with its ledger row and its probe verdict.
  up       Run everything pending, in order. Dry run unless --confirm.
  adopt    Write ledger rows for migrations the probe reports as already applied.
           Use once per dataset to seed the register for work done before it existed.

  --dataset <name>  REQUIRED. No environment fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --only <id>       Restrict to one migration id.`

const args = parseScriptArgs({
  commands: ['status', 'up', 'adopt'],
  values: ['only'],
  usage: USAGE,
})
const { command, dataset, confirm, only } = args

if (only && !byId.has(only)) {
  console.error(`\n✖ Unknown migration id \`${only}\`.\n\n${MIGRATIONS.map((m) => `  ${m.id}`).join('\n')}\n`)
  process.exit(1)
}

const selected = only ? [byId.get(only)] : MIGRATIONS

const client = makeClient(dataset, { write: confirm })

const ICON = { applied: '✓', pending: '·', unknown: '?', superseded: '—' }

/** Run one migration's probe. `null` probe → unknown, never guessed. */
async function probeState(m) {
  if (m.supersededBy) return 'superseded'
  if (!m.probe) return 'unknown'
  try {
    return (await client.fetch(`{"ok": ${m.probe}}`)).ok ? 'applied' : 'pending'
  } catch (err) {
    console.error(`  ⚠️  probe failed for ${m.id}: ${err.message}`)
    return 'unknown'
  }
}

const checksum = (scriptPath) => {
  try {
    return createHash('sha256').update(readFileSync(join(repoRoot, scriptPath))).digest('hex').slice(0, 12)
  } catch {
    return null
  }
}

const gitSha = () => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot }).toString().trim()
  } catch {
    return null
  }
}

const ranBy = () => {
  try {
    return execFileSync('git', ['config', 'user.email'], { cwd: repoRoot }).toString().trim()
  } catch {
    return process.env.USER || null
  }
}

function banner() {
  console.log(
    `\n▸ sanity:migrate ${command}  project=${PROJECT_ID}  dataset=${dataset}  ` +
      `mode=${confirm ? `CONFIRM (writes to ${dataset})` : 'DRY-RUN (no writes)'}\n`,
  )
}

/**
 * Gather ledger + probe for a list of migrations.
 *
 * Defaults to the WHOLE manifest, never to `--only`: the dependency check reads this,
 * and a survey narrowed to one migration cannot see the prerequisite it depends on —
 * which reported a satisfied dependency as missing.
 */
async function survey(list = MIGRATIONS) {
  const ledger = await readLedger(client)
  const rows = []
  for (const m of list) {
    const row = ledger.get(m.id) || null
    const probe = await probeState(m)
    const drifted = row?.checksum && checksum(m.script) && row.checksum !== checksum(m.script)
    rows.push({ m, row, probe, drifted })
  }
  return rows
}

async function cmdStatus() {
  banner()
  const rows = await survey(selected)
  const w = Math.max(...rows.map((r) => r.m.id.length))
  console.log(`  ${'id'.padEnd(w)}  ledger      probe       `)
  console.log(`  ${'-'.repeat(w)}  ----------  ----------  ----`)
  for (const { m, row, probe, drifted } of rows) {
    const led = row ? (row.adopted ? `adopted` : (row.ranAt || '').slice(0, 10)) : '—'
    const notes = []
    if (m.supersededBy) notes.push(`superseded by ${m.supersededBy}`)
    else if (!row && probe === 'applied') notes.push('⚠ ran outside the runner — `adopt` to record it')
    else if (row && probe === 'pending') notes.push('🔴 ledger says run, probe says PENDING')
    else if (probe === 'pending') notes.push('→ will run')
    else if (probe === 'unknown' && !row) notes.push('no probe — decide by hand')
    if (drifted) notes.push('⚠ script edited since it ran')
    if (m.args === 'legacy-env') notes.push('needs --dataset retrofit (Phase 2)')
    console.log(`  ${m.id.padEnd(w)}  ${led.padEnd(10)}  ${(ICON[probe] + ' ' + probe).padEnd(10)}  ${notes.join(' · ')}`)
  }

  const pending = rows.filter((r) => r.probe === 'pending' && !r.m.supersededBy)
  const unrecorded = rows.filter((r) => !r.row && r.probe === 'applied')
  console.log(`\n  dataset=${dataset}: ${pending.length} pending, ${unrecorded.length} applied but unrecorded, ` +
    `${rows.filter((r) => r.probe === 'unknown').length} unknown.`)
  if (pending.length) {
    console.log(`\n  Pending on ${dataset}:`)
    for (const { m } of pending) console.log(`    ${m.id}  ${m.ticket ? `(${m.ticket})  ` : ''}${m.title}`)
  }
  console.log(`\n  ${HISTORIC.length} historic packages/sanity migrations and ${TASKS.length} repeatable tasks are not tracked here.\n`)
}

async function cmdAdopt() {
  banner()
  const rows = await survey(selected)
  const adoptable = rows.filter((r) => !r.row && r.probe === 'applied')
  if (!adoptable.length) {
    console.log(`  Nothing to adopt on dataset=${dataset} — every probe-applied migration already has a ledger row.\n`)
    return
  }
  for (const { m } of adoptable) console.log(`  ${confirm ? '✏️ ' : '•'} ${m.id}  ${m.title}`)
  if (!confirm) {
    console.log(`\n  DRY-RUN on dataset=${dataset} — ${adoptable.length} row(s) would be written. Re-run with --confirm.\n`)
    return
  }
  for (const { m } of adoptable) {
    await writeLedgerEntry(client, {
      migrationId: m.id,
      ticket: m.ticket,
      title: m.title,
      checksum: checksum(m.script),
      scriptPath: m.script,
      adopted: true,
      gitSha: gitSha(),
      ranBy: ranBy(),
      log: 'Adopted from the migration probe: the dataset already carried this change when the ledger was introduced. No script was executed.',
    })
  }
  console.log(`\n  ✅ Adopted ${adoptable.length} migration(s) into the ledger on dataset=${dataset}.\n`)
}

/** Stream a child process while capturing its output for the ledger. */
function run(cmd, cmdArgs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, { cwd: repoRoot, env: process.env })
    let out = ''
    const capture = (chunk) => {
      out += chunk
      process.stdout.write(chunk)
    }
    child.stdout.on('data', capture)
    child.stderr.on('data', capture)
    child.on('close', (code) => resolve({ code, out }))
  })
}

async function cmdUp() {
  banner()
  const rows = await survey() // whole manifest — the dependency check below reads it
  const applied = new Set(rows.filter((r) => r.row || r.probe === 'applied').map((r) => r.m.id))
  const selectedIds = new Set(selected.map((m) => m.id))
  const queue = rows.filter(
    (r) => r.probe === 'pending' && !r.m.supersededBy && selectedIds.has(r.m.id),
  )

  if (!queue.length) {
    console.log(`  Nothing to do on dataset=${dataset} — no migration's probe reports pending.\n`)
    return
  }

  console.log(`  ${queue.length} pending on dataset=${dataset}:\n`)
  for (const { m } of queue) console.log(`    ${m.id}  ${m.ticket ? `(${m.ticket})  ` : ''}${m.title}`)
  console.log()

  for (const { m } of queue) {
    const missing = (m.after || []).filter((dep) => !applied.has(dep))
    if (missing.length) {
      console.error(`  ✖ ${m.id} depends on ${missing.join(', ')}, which ${dataset} has not had applied. Stopping.\n`)
      process.exit(1)
    }
    if (m.args === 'legacy-env') {
      console.error(
        `  ✖ ${m.id} resolves its dataset from NEXT_PUBLIC_SANITY_DATASET, so the runner cannot\n` +
          `    honour --dataset on its behalf. Retrofit it to script-args.mjs (Phase 2), or run it\n` +
          `    by hand and then \`adopt\`. Stopping rather than guessing.\n` +
          `    To run a later, non-legacy migration on its own, name it: --only <id>.\n`,
      )
      process.exit(1)
    }
  }

  if (!confirm) {
    console.log(`  DRY-RUN on dataset=${dataset} — each script would be invoked with --dataset ${dataset} --confirm.`)
    console.log(`  Re-run with --confirm${dataset === 'production' ? ' --yes-production' : ''} to apply.\n`)
    return
  }

  for (const { m } of queue) {
    const childArgs = ['--filter', m.pkg, 'run', m.task, '--', '--dataset', dataset, '--confirm']
    if (dataset === 'production') childArgs.push('--yes-production')
    console.log(`\n${'─'.repeat(78)}\n▸ ${m.id} — pnpm ${childArgs.join(' ')}\n${'─'.repeat(78)}`)

    const { code, out } = await run('pnpm', childArgs)
    if (code !== 0) {
      console.error(`\n  ✖ ${m.id} exited ${code}. Nothing recorded; later migrations not attempted.\n`)
      process.exit(code)
    }

    // The exit code says the process ended well. Only the probe says the dataset changed.
    const after = await probeState(m)
    if (after === 'pending') {
      console.error(
        `\n  🔴 ${m.id} exited 0 but its probe still reports PENDING on ${dataset}.\n` +
          `     Not recording it. This is the BUG-0032 shape — check the script's banner said\n` +
          `     dataset=${dataset} before trusting the tick.\n`,
      )
      process.exit(1)
    }

    await writeLedgerEntry(client, {
      migrationId: m.id,
      ticket: m.ticket,
      title: m.title,
      checksum: checksum(m.script),
      scriptPath: m.script,
      command: `pnpm ${childArgs.join(' ')}`,
      adopted: false,
      gitSha: gitSha(),
      ranBy: ranBy(),
      log: out,
    })
    console.log(`  ✅ ${m.id} applied to ${dataset} and recorded.`)
  }
  console.log(`\n  ✅ ${queue.length} migration(s) applied to dataset=${dataset}.\n`)
}

const commands = { status: cmdStatus, up: cmdUp, adopt: cmdAdopt }
await commands[command]().catch((err) => {
  console.error(`\n✖ ${err.message}\n`)
  process.exit(1)
})
