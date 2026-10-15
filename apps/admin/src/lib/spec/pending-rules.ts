import type { ChangesetItem } from "./registry-api";

/**
 * Which of a record's rule fields have a change waiting for approval (PROD-2962 scope 4: "fields with
 * a pending frame are marked 'pending'"). Read from the frames' own Sanity items: each names the
 * document it writes, the fields it changes (`ops[].field`) and, for a list, the entry each op is
 * about (`ops[].match.ref` — the option offered, excepted or made compatible).
 */
export type PendingFrame = { id: string; at: string };
export type PendingField = {
  /** The waiting frames that change this field, newest first — the newest proposal wins (ADR-025). */
  frames: PendingFrame[];
  /** The entries those frames change in the field, by id (empty for a whole-value field). */
  refs: string[];
};
export type PendingRules = Record<string, PendingField>;

type Op = { field?: unknown; match?: { ref?: unknown } };

export function pendingRulesOf(docId: string, frames: { id: string; created_at: string; items: ChangesetItem[] }[]): PendingRules {
  const out: PendingRules = {};
  for (const f of [...frames].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    for (const it of f.items) {
      // Only a Sanity write still to happen: not excluded, not already applied, stale or failed.
      if (it.entity_type !== "sanity_document" || it.target_ref !== docId || it.excluded_at || it.apply_state) continue;
      const ops = Array.isArray(it.payload?.ops) ? (it.payload.ops as Op[]) : [];
      for (const op of ops) {
        if (typeof op.field !== "string") continue;
        const p = (out[op.field] ??= { frames: [], refs: [] });
        if (!p.frames.some((x) => x.id === f.id)) p.frames.push({ id: f.id, at: f.created_at });
        const ref = op.match?.ref;
        if (typeof ref === "string" && !p.refs.includes(ref)) p.refs.push(ref);
      }
    }
  }
  return out;
}
