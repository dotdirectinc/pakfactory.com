import type { ConditionalPropertyCallback } from 'sanity'

/**
 * The read-only switch for the customization rules (PROD-2988, ADR-025): once the Spec System owns
 * the rules for a dataset, Studio shows them but cannot change them.
 *
 * Per DEPLOYED STUDIO, not per codebase: the same build serves the staging Studio (development
 * dataset, where the Spec System edits the rules) and the production Studio (production dataset, not
 * yet — PROD-2963). So the switch is a build-time setting each target in
 * scripts/sanity/studio-targets.mjs exports. Unset is the safe default: the fields stay editable.
 * Turning it off again — the revert flag — is the same setting, set to anything but "true", and a
 * redeploy; no code change.
 */

export const SPEC_OWNS_RULES = process.env.SANITY_STUDIO_SPEC_OWNS_RULES === 'true'

/**
 * The same switch for catalog STRUCTURE — a record's parents (PROD-3008, ADR-026 option A): Studio
 * creates a record with its parents; once the record has a registry id (Sync registered it, so the
 * Spec System can move it) its parent fields are read-only here. Decided by Richard 2026-10-16 over
 * "on first publish", which left a gap where neither side could change a new record's parents.
 */
export const SPEC_OWNS_STRUCTURE = process.env.SANITY_STUDIO_SPEC_OWNS_STRUCTURE === 'true'

/** A parent field's `readOnly`: locked when the switch is on and the record is registered. */
export const parentLocked: ConditionalPropertyCallback = ({ document }) => {
  const entityId = (document as { entityId?: unknown } | undefined)?.entityId
  return SPEC_OWNS_STRUCTURE && typeof entityId === 'string' && entityId.length > 0
}

/** The admin office's base URL, for the note's link; unset leaves the note without one. */
const SPEC_SYSTEM_URL = (process.env.SANITY_STUDIO_SPEC_SYSTEM_URL || '').trim().replace(/\/+$/, '')

/** The Spec System's Catalog levels a rule-bearing record opens at. */
export type SpecLevel =
  | 'product'
  | 'inspiration'
  | 'productStyle'
  | 'customizationOption'
  | 'customizationType'
  | 'solutionStyle'

/** The record's page in the Spec System, or null when no admin URL is configured. */
export function specRecordUrl(level: SpecLevel, documentId: string | undefined): string | null {
  if (!SPEC_SYSTEM_URL || !documentId) return null
  return `${SPEC_SYSTEM_URL}/spec/catalog/${level}/${encodeURIComponent(documentId.replace(/^drafts\./, ''))}`
}
