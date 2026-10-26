"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import { Input } from "@pakfactory/ui/components/input";
import { optionEditStateAction, saveOptionEditAction } from "@/app/(admin)/spec/actions";
import { SpecDecisionBar } from "@/components/spec/spec-decision-bar";
import { ADMIN_SPEC_OPTION_EDIT_COPY as COPY } from "@/lib/copy/spec";
import {
  buildRows,
  differs,
  groupRows,
  rowKey,
  settlePending,
  visibleRows,
  type FrameRow,
  type ProposalRow,
  type RowFilter,
} from "@/lib/spec/option-frame-rows";
import type { OptionCandidates, OptionEditKind, OptionEditState } from "@/lib/spec/registry-api";

type Props = {
  changesetId: string;
  rules: { offeredOn: ProposalRow[]; compatibleWith: ProposalRow[] };
  /** The planner's sentences: the first states the basis; "⚠" ones are warnings. */
  sentences: string[];
  /** How many other Active options of its type the standard set was taken from. */
  basisCount: number;
  /** The frame registers the option in the registry too (not only writes it to Sanity). */
  registers: boolean;
  initial: OptionEditState;
  candidates: OptionCandidates;
  canEdit: boolean;
  blockedBy: string[];
};

type Pending = { selected: boolean; rev: number | null };

/**
 * A new option's Register frame, edited before approval (PROD-3167). Shared and saved per click, no lock:
 * the page reads the frame's edit state every 3 s while it is visible and pending, a tick stays on screen
 * until its save is seen back, and Approve sends the revision on screen — the server refuses a stale one.
 */
export function SpecOptionFrameEditor({ changesetId, rules, sentences, basisCount, registers, initial, candidates, canEdit, blockedBy }: Props) {
  const router = useRouter();
  const [edit, setEdit] = useState(initial);
  const [pending, setPending] = useState<Map<string, Pending>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const draft = edit.state === "draft";
  const editable = draft && canEdit;
  const wasDraft = useRef(draft);

  const apply = useCallback((next: OptionEditState) => {
    setEdit(next);
    setPending((p) => settlePending(p, next.revision));
    if (next.replacedBy) router.replace(`/spec/${next.replacedBy}`);
    // Someone approved or discarded it: the server page shows the decided frame.
    if (wasDraft.current && next.state !== "draft") router.refresh();
    wasDraft.current = next.state === "draft";
  }, [router]);

  const poll = useCallback(async () => {
    const res = await optionEditStateAction(changesetId);
    if (res.ok) apply(res.data);
  }, [changesetId, apply]);

  // Polling, not push (AC 10): every 3 s, only while the page is visible and the frame is pending.
  useEffect(() => {
    if (!draft) return;
    const tick = () => { if (document.visibilityState === "visible") void poll(); };
    const t = setInterval(tick, 3000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [draft, poll]);

  async function save(kind: OptionEditKind, id: string, selected: boolean, reason?: string | null) {
    const key = rowKey(kind, id);
    setError(null);
    setPending((p) => new Map(p).set(key, { selected, rev: null }));
    const res = await saveOptionEditAction(changesetId, { kind, target: id, selected, ...(reason !== undefined ? { reason } : {}) });
    setPending((p) => {
      const n = new Map(p);
      const mine = n.get(key);
      if (!res.ok) { if (mine?.selected === selected) n.delete(key); return n; }
      // A later click on the same row owns the entry; this save only settles its own.
      if (mine && mine.selected === selected && mine.rev === null) n.set(key, { selected, rev: res.revision ?? 0 });
      return n;
    });
    if (!res.ok) { setError(COPY.saveFailed(res.error)); void poll(); }
  }

  const offers = useMemo(() => buildRows("offer", rules.offeredOn, candidates.offers, edit.edits, pending), [rules.offeredOn, candidates.offers, edit.edits, pending]);
  const pairs = useMemo(() => buildRows("pair", rules.compatibleWith, candidates.pairs, edit.edits, pending), [rules.compatibleWith, candidates.pairs, edit.edits, pending]);
  const labelOf = useMemo(() => new Map(offers.map((r) => [r.id, r.label])), [offers]);
  const chosenOffers = offers.filter((r) => r.selected).length;
  const chosenPairs = pairs.filter((r) => r.selected).length;
  const notes = sentences.filter((s) => s.startsWith("⚠") || s.startsWith("Picks made in Studio") || s.startsWith("No standard set"));

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-foreground">{COPY.heading}</h2>
        {sentences[0] ? <p className="text-sm text-foreground">{sentences[0]}</p> : null}
        {editable ? <p className="text-sm text-muted-foreground">{COPY.lead}</p> : null}
        {draft && !canEdit ? <p className="text-sm text-muted-foreground">{COPY.readOnly}</p> : null}
        {edit.editedBy && edit.editedAt ? (
          <p className="text-xs text-muted-foreground">{COPY.editedBy(edit.editedBy, new Date(edit.editedAt).toLocaleTimeString())}</p>
        ) : null}
      </div>

      {notes.map((n) => <p key={n} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">{n}</p>)}
      {edit.replacedBy ? <p role="status" className="text-sm text-muted-foreground">{COPY.replaced}</p> : null}
      {edit.proposalUpdated && draft ? <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">{COPY.proposalUpdated}</p> : null}
      {edit.state === "approved" && edit.approvedBy ? <p role="status" className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">{COPY.approvedBy(edit.approvedBy)}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <RowPanel
          title={COPY.offeredOn}
          count={COPY.products(chosenOffers)}
          rows={offers}
          empty={candidates.offersDecided ? null : COPY.noOffers}
          basisCount={basisCount}
          editable={editable}
          onToggle={(id, selected) => save("offer", id, selected)}
        />
        <RowPanel
          title={COPY.compatibleWith}
          count={COPY.options(chosenPairs)}
          rows={pairs}
          empty={null}
          basisCount={basisCount}
          editable={editable}
          onToggle={(id, selected) => save("pair", id, selected)}
        />
      </div>

      <Differences offers={offers} pairs={pairs} editable={editable} onReason={(kind, row, reason) => save(kind, row.id, row.selected, reason)} />

      {draft && edit.gaps.length ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.gapsHeading}</h3>
          <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto text-sm text-amber-800 dark:text-amber-300">
            {edit.gaps.map((g) => <li key={`${g.product}:${g.group}`}>⚠ {COPY.gap(labelOf.get(g.product) ?? g.product, g.targets)}</li>)}
          </ul>
        </div>
      ) : null}

      {draft ? (
        <SpecDecisionBar
          changesetId={changesetId}
          // The option (and its rows, when it registers), its own document, and one per product it is offered on.
          itemCount={(registers ? 1 + chosenPairs + chosenOffers : 0) + 1 + chosenOffers}
          writesToSanity
          canDecide={canEdit}
          blockedBy={blockedBy}
          revision={edit.revision}
          onRefused={() => void poll()}
        />
      ) : null}
    </section>
  );
}

const FILTERS: RowFilter[] = ["proposed", "selected", "differs", "all"];

function RowPanel({ title, count, rows, empty, basisCount, editable, onToggle }: {
  title: string;
  count: string;
  rows: FrameRow[];
  empty: string | null;
  basisCount: number;
  editable: boolean;
  onToggle: (id: string, selected: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RowFilter>("proposed");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = groupRows(visibleRows(rows, filter, query));
  // A search, or a short list, opens every group: the rows are what was asked for.
  const allOpen = !!query.trim() || groups.length <= 3;

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
      </div>
      {empty ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <>
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={COPY.search} aria-label={`${title} — ${COPY.search}`} className="h-8" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as RowFilter)}
              aria-label={`${title} — ${COPY.show}`}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {FILTERS.map((f) => <option key={f} value={f}>{COPY.filters[f]}</option>)}
            </select>
          </div>
          <div className="flex max-h-[28rem] flex-col overflow-y-auto">
            {groups.length === 0 ? <p className="py-2 text-sm text-muted-foreground">{COPY.noRows}</p> : null}
            {groups.map((g) => {
              const isOpen = allOpen || open.has(g.group);
              return (
                <div key={g.group} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(g.group)) n.delete(g.group); else n.add(g.group); return n; })}
                    className="flex w-full items-center justify-between gap-2 py-1.5 text-left text-sm text-foreground"
                  >
                    <span className="truncate">{isOpen ? "▾" : "▸"} {g.group}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{g.selected}/{g.rows.length}</span>
                  </button>
                  {isOpen ? (
                    <ul className="flex flex-col pb-1.5">
                      {g.rows.map((r) => <Row key={r.id} row={r} basisCount={basisCount} editable={editable} onToggle={onToggle} />)}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ row, basisCount, editable, onToggle }: { row: FrameRow; basisCount: number; editable: boolean; onToggle: (id: string, selected: boolean) => void }) {
  const id = `row-${row.id}`;
  return (
    <li className="flex items-start gap-2 py-0.5 pl-4 text-sm">
      <Checkbox id={id} checked={row.selected} disabled={!editable} onCheckedChange={(v) => onToggle(row.id, v === true)} className="mt-0.5" />
      <label htmlFor={id} className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <span className={row.selected ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/50"}>{row.label}</span>
        {row.standard ? <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">{COPY.standard(row.share, basisCount)}</Badge> : null}
        {row.studio ? <Badge variant="outline" className="px-1.5 py-0 text-[11px]">{COPY.studio}</Badge> : null}
        {row.saving ? <span className="text-xs text-muted-foreground">{COPY.saving}</span>
          : row.edit ? <span className="text-xs text-muted-foreground">{row.edit.selected ? COPY.added(row.edit.by) : COPY.removed(row.edit.by)}</span> : null}
      </label>
    </li>
  );
}

function Differences({ offers, pairs, editable, onReason }: {
  offers: FrameRow[];
  pairs: FrameRow[];
  editable: boolean;
  onReason: (kind: OptionEditKind, row: FrameRow, reason: string | null) => void;
}) {
  const list = [
    ...offers.filter(differs).map((r) => ({ kind: "offer" as const, row: r })),
    ...pairs.filter(differs).map((r) => ({ kind: "pair" as const, row: r })),
  ];
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.differsHeading} · {list.length}</h3>
      <p className="text-xs text-muted-foreground">{COPY.differsLead}</p>
      {list.length === 0 ? <p className="text-sm text-muted-foreground">{COPY.differsNone}</p> : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {list.map(({ kind, row }) => (
            <li key={rowKey(kind, row.id)} className="flex flex-col gap-1 rounded-md border border-border px-2 py-1.5 text-sm sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1">
                <span className={row.selected ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {row.selected ? COPY.differsAdded : COPY.differsRemoved}
                </span>{" "}
                <span className="text-muted-foreground">{kind === "offer" ? COPY.offeredOn : COPY.compatibleWith}:</span> {row.label}
              </span>
              <ReasonInput initial={row.edit?.reason ?? ""} disabled={!editable} onSave={(reason) => onReason(kind, row, reason)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReasonInput({ initial, disabled, onSave }: { initial: string; disabled: boolean; onSave: (reason: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const [focused, setFocused] = useState(false);
  // Someone else's reason arrives by polling; never over what this person is typing.
  useEffect(() => { if (!focused) setValue(initial); }, [initial, focused]);
  return (
    <Input
      value={value}
      disabled={disabled}
      placeholder={COPY.reason}
      aria-label={COPY.reason}
      maxLength={500}
      className="h-8 sm:w-64"
      onFocus={() => setFocused(true)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { setFocused(false); if (value.trim() !== initial.trim()) onSave(value.trim() || null); }}
    />
  );
}
