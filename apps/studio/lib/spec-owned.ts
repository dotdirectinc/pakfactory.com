import type { ConditionalPropertyCallback } from 'sanity'

/**
 * Who owns the catalog RELATIONS in this Studio's dataset (PROD-2988 / PROD-3008): the Spec System
 * ("spec") or Studio. When the Spec System owns them, Studio shows them read-only:
 *
 *   rules      the five customization-rule fields (an inspiration product's pre-selections excepted)
 *   structure  a REGISTERED record's parents — a new record keeps editable parents until Sync gives it a
 *              registry id (Richard, 2026-10-16), so neither side is ever without a way to set them
 *
 * Read at RUN TIME from the read-only marker document `specRelationsOwner`, which only the server writes
 * when an admin flips the switch in the admin office (Spec System → Registry). No marker = Studio owns
 * both — the production dataset has none. `SpecOwnerLayout` loads it before the Studio renders and
 * keeps it current; reverting is one click there, no redeploy.
 */

let owner = { rules: false, structure: false }

/** Set by SpecOwnerLayout from the marker; anything but "spec" leaves the field editable. */
export function setSpecOwner(marker: { rules?: unknown; structure?: unknown } | null | undefined): void {
  owner = { rules: marker?.rules === 'spec', structure: marker?.structure === 'spec' }
}

/** A rule field's `readOnly`. */
export const rulesLocked = (): boolean => owner.rules

/** A parent field's `readOnly`: locked when the Spec System owns structure and the record is registered. */
export const parentLocked: ConditionalPropertyCallback = ({ document }) => {
  const entityId = (document as { entityId?: unknown } | undefined)?.entityId
  return owner.structure && typeof entityId === 'string' && entityId.length > 0
}

export const SPEC_OWNER_MARKER_ID = 'specRelationsOwner'

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
