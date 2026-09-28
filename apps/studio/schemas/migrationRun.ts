import { CheckmarkCircleIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

/**
 * migrationRun — the Sanity migration ledger. One document per migration, per dataset.
 *
 * ── Why this is a document and not a file in git ────────────────────────────────
 *
 * "Has this migration run against production?" is a fact about the DATASET. Git holds
 * the same commit for everyone, while `development` and `production` have had different
 * things applied to them — so only the dataset can answer. A file in the repo would be a
 * hand-kept claim about a remote system, and it would be wrong the first time somebody
 * ran a script without remembering to edit it.
 *
 * Two consequences follow from storing it here, and both are the behaviour we want:
 *   - a restore from backup rolls the ledger back together with the data it describes;
 *   - `sanity:sync-prod-to-dev` carries production's ledger into development, which is
 *     correct — after that sync, development HAS had those migrations applied.
 *
 * ── Written by the runner, not by editors ───────────────────────────────────────
 *
 * Every field is read-only in the Studio. `scripts/sanity/migrate.mjs` writes these
 * rows; a human editing one would be changing the record of what happened rather than
 * what happened. The desk pane exists so the answer is visible from the deployed Studio
 * without a terminal — see `structure/index.ts`.
 */
export const migrationRun = defineType({
  name: 'migrationRun',
  title: 'Migration Run',
  type: 'document',
  icon: CheckmarkCircleIcon,
  readOnly: true,
  fields: [
    defineField({
      name: 'migrationId',
      title: 'Migration ID',
      type: 'string',
      description: 'Key from scripts/sanity/migrations.manifest.mjs, e.g. 20260917-unset-verified-deprecations.',
    }),
    defineField({ name: 'ticket', title: 'Ticket', type: 'string' }),
    defineField({ name: 'title', title: 'What it did', type: 'string' }),
    defineField({
      name: 'ranAt',
      title: 'Recorded at',
      type: 'datetime',
      description: 'When this row was written — the run time, or the adoption time for an adopted row.',
    }),
    defineField({ name: 'ranBy', title: 'Run by', type: 'string' }),
    defineField({
      name: 'gitSha',
      title: 'Git SHA',
      type: 'string',
      description: 'Repo HEAD when the runner wrote this row.',
    }),
    defineField({
      name: 'checksum',
      title: 'Script checksum',
      type: 'string',
      description:
        'sha256 (first 12) of the script as it stood when it ran. A later mismatch means the migration was edited after the fact, which `status` flags.',
    }),
    defineField({ name: 'scriptPath', title: 'Script', type: 'string' }),
    defineField({ name: 'command', title: 'Command', type: 'string' }),
    defineField({ name: 'docsTouched', title: 'Documents touched', type: 'number' }),
    defineField({
      name: 'adopted',
      title: 'Adopted from probe',
      type: 'boolean',
      description:
        'True when the row records that the dataset was ALREADY in the migrated shape, rather than a run we performed. Most pre-2026-09 rows are adopted.',
    }),
    defineField({
      name: 'log',
      title: 'Run log',
      type: 'text',
      rows: 12,
      description:
        "The script's captured output. This is where a destructive migration's printed record of what it discarded survives — PROD-2538 says of its deliberate-loss list \"the printed list is the record\", and terminal scrollback is not a record.",
    }),
  ],
  preview: {
    select: { title: 'migrationId', subtitle: 'title', adopted: 'adopted', ranAt: 'ranAt' },
    prepare({ title, subtitle, adopted, ranAt }) {
      const when = ranAt ? String(ranAt).slice(0, 10) : '—'
      return { title, subtitle: `${adopted ? 'adopted' : 'ran'} ${when} · ${subtitle ?? ''}` }
    },
  },
})
