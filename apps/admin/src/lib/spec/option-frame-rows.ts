/**
 * The rows of a new option's Register frame (PROD-3167): the proposal (its type's standard set plus
 * Studio's picks), every other row that could be added, the shared edits laid over them, and this
 * browser's clicks that are still saving laid over those — a tick stays on screen while it saves.
 */
import type { OptionCandidate, OptionEditKind, OptionEditState } from "@/lib/spec/registry-api";

export type ProposalRow = { id: string; label: string; standard: boolean; studio: boolean; share: number | null };

export type FrameRow = {
  id: string;
  label: string;
  group: string;
  standard: boolean;
  studio: boolean;
  share: number | null;
  /** In the frame's proposal (standard or from Studio). */
  proposed: boolean;
  selected: boolean;
  /** The last saved edit of this row, if any. */
  edit: { selected: boolean; by: string | null; reason: string | null } | null;
  /** This browser clicked it and the save has not been seen back yet. */
  saving: boolean;
};

export type RowFilter = "proposed" | "selected" | "differs" | "all";

export const rowKey = (kind: OptionEditKind, id: string) => `${kind}:${id}`;

export function buildRows(
  kind: OptionEditKind,
  proposal: ProposalRow[],
  candidates: OptionCandidate[],
  edits: OptionEditState["edits"],
  pending: ReadonlyMap<string, { selected: boolean }>,
): FrameRow[] {
  const group = new Map(candidates.map((c) => [c.id, c.group]));
  const rows = new Map<string, FrameRow>();
  const blank = (id: string, label: string): FrameRow =>
    ({ id, label, group: group.get(id) ?? "Other", standard: false, studio: false, share: null, proposed: false, selected: false, edit: null, saving: false });
  for (const c of candidates) rows.set(c.id, blank(c.id, c.label));
  for (const p of proposal) {
    rows.set(p.id, { ...(rows.get(p.id) ?? blank(p.id, p.label)), label: p.label, standard: p.standard, studio: p.studio, share: p.share, proposed: true, selected: true });
  }
  for (const e of edits) {
    if (e.kind !== kind) continue;
    const r = rows.get(e.target) ?? blank(e.target, e.target);
    rows.set(e.target, { ...r, selected: e.selected, edit: { selected: e.selected, by: e.by, reason: e.reason } });
  }
  for (const [key, p] of pending) {
    const [k, id] = key.split(":");
    const r = id ? rows.get(id) : undefined;
    if (k !== kind || !id || !r) continue;
    rows.set(id, { ...r, selected: p.selected, saving: true });
  }
  return [...rows.values()];
}

/** A row that differs from the standard set: a standard row left out, or any other row kept. */
export const differs = (r: FrameRow) => r.selected !== r.standard;

export function visibleRows(rows: FrameRow[], filter: RowFilter, query: string): FrameRow[] {
  const q = query.trim().toLowerCase();
  // A search looks through every row — that is how a row is found to add it.
  if (q) return rows.filter((r) => r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q));
  if (filter === "all") return rows;
  if (filter === "selected") return rows.filter((r) => r.selected);
  if (filter === "differs") return rows.filter(differs);
  return rows.filter((r) => r.proposed || r.edit || r.saving);
}

export function groupRows(rows: FrameRow[]): { group: string; rows: FrameRow[]; selected: number }[] {
  const out = new Map<string, FrameRow[]>();
  for (const r of rows) out.set(r.group, [...(out.get(r.group) ?? []), r]);
  return [...out]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, rs]) => ({ group, rows: rs.sort((a, b) => a.label.localeCompare(b.label)), selected: rs.filter((r) => r.selected).length }));
}

/**
 * Drop the clicks whose save has been seen back: a click is kept until a read at or after the revision
 * its save returned — so a read that started before the save cannot flip the tick back (guard 1).
 */
export function settlePending<T extends { rev: number | null }>(pending: ReadonlyMap<string, T>, revision: number): Map<string, T> {
  return new Map([...pending].filter(([, p]) => p.rev === null || p.rev > revision));
}
