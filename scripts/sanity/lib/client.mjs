/**
 * Sanity client + token resolution for the migration runner.
 *
 * Mirrors the env loading every `apps/studio/scripts/*.mjs` already does — repo-root
 * `.env.local`, then `.env`, then `apps/studio/.env.local` with `override: true` — so
 * the runner reads exactly the same credentials as the scripts it drives. If the runner
 * and a script disagreed about which token they hold, the ledger would describe a
 * dataset nobody wrote to.
 *
 * ⚠️ The DATASET is never resolved here. It arrives as an argument, always. See
 * `.claude/rules/dataset-script-placement-and-flags.md` and BUG-0032: an ambient
 * dataset default is what let a dropped flag write to the wrong place and report success.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const repoRoot = join(__dirname, '../../..')

loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

export const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'

const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01'

export const readToken = () =>
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

export const writeToken = () =>
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN

/**
 * @param {string} dataset  REQUIRED — no fallback, deliberately.
 * @param {{ write?: boolean }} [opts]
 */
export function makeClient(dataset, { write = false } = {}) {
  if (!dataset) throw new Error('makeClient(dataset) — dataset is required, there is no default.')
  const token = write ? writeToken() : readToken()
  if (!token) {
    throw new Error(
      write
        ? 'Missing a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN) — a read token cannot write the ledger.'
        : 'Missing a Sanity token (SANITY_API_WRITE_TOKEN / SANITY_API_READ_TOKEN / SANITY_TOKEN).',
    )
  }
  return createClient({
    projectId: PROJECT_ID,
    dataset,
    apiVersion: API_VERSION,
    token,
    useCdn: false,
    perspective: 'raw',
  })
}
