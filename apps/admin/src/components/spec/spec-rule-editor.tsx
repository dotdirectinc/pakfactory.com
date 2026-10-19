"use client";

import { InlineLoading } from "@/components/ui/page-skeleton";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@pakfactory/ui/components/select";
import type { TableKey } from "@/lib/spec/catalog-table-model";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import type { Choice, RuleEditorData } from "@/lib/spec/rule-editor-data";
import { loadPendingRules, loadRecordEdits, loadRuleEditor, type RecordEdit } from "@/app/(admin)/spec/rule-edit-actions";
import type { PendingField, PendingRules } from "@/lib/spec/pending-rules";
import Link from "next/link";
import { RuleEditFooter, SubmitResultNote, useRuleEditSession, WithRuleEditSession } from "@/components/spec/rule-edit-session";
import { ADMIN_SPEC_RULE_EDIT_COPY as COPY } from "@/lib/copy/spec";

/**
 * The customization rules of one record, and editing them (PROD-2962, ADR-025). Shared by the
 * Catalog record page and the Spec Map panel through SpecRecordView. The edits live in the page's
 * rule-edit session, so on the Spec Map the diagram shows them (and makes them) too; this view is
 * the record's rules with the session's edits applied.
 */
type Data = RuleEditorData & { canEdit: boolean };
type EditableData = Exclude<Data, { kind: "none" }>;
type Exc = Choice & { mode: "add" | "remove"; reason: string };

export function SpecRuleEditor(props: { level: TableKey; id: string; title: string }) {
  if (props.level !== "product" && props.level !== "customizationOption" && props.level !== "customizationType") return null;
  return (
    <WithRuleEditSession>
      <RuleSection {...props} />
    </WithRuleEditSession>
  );
}

function RuleSection({ level, id, title }: { level: TableKey; id: string; title: string }) {
  const s = useRuleEditSession()!;
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Fields with a change already waiting for approval; none when the read fails. */
  const [pending, setPending] = useState<PendingRules>({});
  const [, start] = useTransition();
  useEffect(() => {
    start(async () => {
      const r = await loadRuleEditor(level, id);
      if (r.ok) { setData(r.data); setLoadError(null); } else setLoadError(r.error);
    });
    void loadPendingRules(id).then((r) => setPending(r.ok ? r.data : {}));
  }, [level, id, s.version]);

  // Every name this record knows, for the session's sentences.
  const { addNames } = s;
  useEffect(() => {
    if (!data || data.kind === "none") return;
    const all: Choice[] = data.kind === "product" ? [...data.offers, ...data.offerChoices, ...data.exceptionChoices, ...data.exceptions]
      : data.kind === "option" ? [...data.compatible, ...data.choices] : [...data.choices, ...data.groups.flat()];
    addNames({ ...Object.fromEntries(all.map((c) => [c.id, c.title])), [id]: title });
  }, [data, id, title, addNames]);

  if (loadError) return <p className="text-sm text-destructive">{COPY.unreachable} ({loadError})</p>;
  if (!data) return <InlineLoading>{COPY.loading}</InlineLoading>;
  const editing = s.editing && data.kind !== "none" && data.canEdit;

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{COPY.title}</h3>
        {data.kind !== "none" && data.canEdit && !s.editing ? (
          <Button size="sm" variant="outline" disabled={s.refreshing || s.moving} title={s.moving ? COPY.closeMoveFirst : undefined} onClick={() => s.setEditing(true)}>{s.refreshing ? COPY.refreshing : COPY.edit}</Button>
        ) : null}
      </div>
      <SubmitResultNote />
      {data.kind === "none" ? <p className="text-sm text-muted-foreground">{data.reason}</p> : <Fields data={data} editing={editing} pending={pending} />}
      {editing ? <RuleEditFooter /> : null}
      {data.kind !== "none" ? <RecordHistory id={id} title={title} /> : null}
    </section>
  );
}

// ── the record's rules, with the session's edits applied ──────────────────────────────────────

function useWorkingCopy(data: EditableData) {
  const { edits, names } = useRuleEditSession()!;
  return useMemo(() => {
    const choice = (id: string, pool: Choice[]): Choice => pool.find((c) => c.id === id) ?? { id, title: names(id), group: "" };
    if (data.kind === "product") {
      const pool = [...data.offers, ...data.offerChoices, ...data.exceptionChoices];
      const offers = new Map(data.offers.map((o) => [o.id, o]));
      const exceptions = new Map<string, Exc>(data.exceptions.map((e) => [`${e.id}|${e.mode}`, e]));
      for (const e of edits) {
        if (e.kind === "offer" && e.productId === data.productId) {
          if (e.offered) offers.set(e.optionId, choice(e.optionId, pool));
          else offers.delete(e.optionId);
        }
        if (e.kind === "exception" && e.productId === data.productId) {
          const k = `${e.optionId}|${e.mode}`;
          if (e.reason === null) exceptions.delete(k);
          else exceptions.set(k, { ...choice(e.optionId, pool), mode: e.mode, reason: e.reason });
        }
      }
      return { offers: [...offers.values()], exceptions: [...exceptions.values()], compatible: [], decidedBy: "product" as const, selects: "one" as const, groups: [] as Choice[][] };
    }
    if (data.kind === "option") {
      const pool = [...data.compatible, ...data.choices];
      const compatible = new Map(data.compatible.map((c) => [c.id, c]));
      for (const e of edits) {
        if (e.kind !== "pair" || (e.a !== data.optionId && e.b !== data.optionId)) continue;
        const other = e.a === data.optionId ? e.b : e.a;
        if (e.compatible) compatible.set(other, choice(other, pool));
        else compatible.delete(other);
      }
      return { offers: [], exceptions: [], compatible: [...compatible.values()], decidedBy: "product" as const, selects: "one" as const, groups: [] as Choice[][] };
    }
    let decidedBy = data.decidedBy;
    let selects = data.customerSelects;
    let groups = data.groups;
    for (const e of edits) {
      if (e.kind === "typeSettings" && e.typeId === data.typeId) {
        decidedBy = e.decidedBy ?? decidedBy;
        selects = e.customerSelects ?? selects;
      }
      if (e.kind === "requirements" && e.typeId === data.typeId) groups = e.groups.map((g) => g.map((x) => choice(x, data.choices)));
    }
    return { offers: [], exceptions: [], compatible: [], decidedBy, selects, groups };
  }, [data, edits, names]);
}

function Fields({ data, editing, pending }: { data: EditableData; editing: boolean; pending: PendingRules }) {
  const s = useRuleEditSession()!;
  const w = useWorkingCopy(data);
  const [newExc, setNewExc] = useState<{ mode: "add" | "remove"; option: Choice | null; reason: string }>({ mode: "remove", option: null, reason: "" });

  if (data.kind === "product") {
    const was = new Set(data.offers.map((o) => o.id));
    const setOffer = (optionId: string, offered: boolean) =>
      s.put({ kind: "offer", productId: data.productId, optionId, offered }, offered === was.has(optionId));
    const origExc = (id: string, mode: "add" | "remove") => data.exceptions.find((x) => x.id === id && x.mode === mode);
    const setException = (id: string, mode: "add" | "remove", reason: string | null) =>
      s.put({ kind: "exception", productId: data.productId, optionId: id, mode, reason }, reason === null ? !origExc(id, mode) : origExc(id, mode)?.reason === reason);
    return (
      <div className="flex flex-col gap-3 text-sm">
        <Field label={COPY.offers} pending={pending.availableCustomizations}>
          <Chips items={w.offers} empty={COPY.noOffers} pendingRefs={pending.availableCustomizations?.refs} onRemove={editing ? (oid) => setOffer(oid, false) : undefined} />
          {editing ? <Picker choices={[...data.offerChoices, ...data.offers].filter((c) => !w.offers.some((o) => o.id === c.id))} placeholder={COPY.addOffer} onPick={(c) => setOffer(c.id, true)} /> : null}
        </Field>
        <Field label={COPY.exceptions} pending={pending.customizationExceptions}>
          {w.exceptions.length ? <ExceptionList items={w.exceptions} pendingRefs={pending.customizationExceptions?.refs} onRemove={editing ? (e) => setException(e.id, e.mode, null) : undefined} /> : <p className="text-muted-foreground">{COPY.noExceptions}</p>}
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={newExc.mode} onValueChange={(v) => setNewExc((x) => ({ ...x, mode: v as "add" | "remove" }))}>
                <SelectTrigger size="sm" className="w-28" aria-label={COPY.exceptionMode}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="remove">{COPY.modes.remove}</SelectItem><SelectItem value="add">{COPY.modes.add}</SelectItem></SelectContent>
              </Select>
              {newExc.option ? (
                <Badge variant="secondary" className="gap-1 font-normal">{newExc.option.title}
                  <button type="button" aria-label={COPY.remove(newExc.option.title)} onClick={() => setNewExc((x) => ({ ...x, option: null }))}><X className="size-3" /></button>
                </Badge>
              ) : (
                <Picker choices={data.exceptionChoices} placeholder={COPY.exceptionOption} onPick={(c) => setNewExc((x) => ({ ...x, option: c }))} />
              )}
              <Input value={newExc.reason} onChange={(e) => setNewExc((x) => ({ ...x, reason: e.target.value }))} placeholder={COPY.reason} aria-label={COPY.reason} className="h-8 max-w-sm flex-1" />
              <Button size="sm" variant="outline" disabled={!newExc.option || !newExc.reason.trim()}
                onClick={() => {
                  setException(newExc.option!.id, newExc.mode, newExc.reason.trim());
                  setNewExc({ mode: newExc.mode, option: null, reason: "" });
                }}>{COPY.addException}</Button>
            </div>
          ) : null}
        </Field>
      </div>
    );
  }

  if (data.kind === "option") {
    const was = new Set(data.compatible.map((c) => c.id));
    const setPair = (b: string, compatible: boolean) => s.put({ kind: "pair", a: data.optionId, b, compatible }, compatible === was.has(b));
    return (
      <Field label={COPY.compatible} pending={pending.compatibleCustomizations}>
        <Chips items={w.compatible} empty={COPY.noCompatible} pendingRefs={pending.compatibleCustomizations?.refs} onRemove={editing ? (cid) => setPair(cid, false) : undefined} />
        {editing ? <Picker choices={[...data.choices, ...data.compatible].filter((c) => !w.compatible.some((x) => x.id === c.id))} placeholder={COPY.addCompatible} onPick={(c) => setPair(c.id, true)} /> : null}
      </Field>
    );
  }

  const setSettings = (decidedBy: "product" | "customization", selects: "one" | "many") =>
    s.put({
      kind: "typeSettings", typeId: data.typeId,
      ...(decidedBy !== data.decidedBy ? { decidedBy } : {}),
      ...(selects !== data.customerSelects ? { customerSelects: selects } : {}),
    }, decidedBy === data.decidedBy && selects === data.customerSelects);
  const flat = (gs: Choice[][]) => JSON.stringify(gs.map((g) => g.map((c) => c.id).sort()).filter((g) => g.length));
  const setGroups = (gs: Choice[][]) =>
    s.put({ kind: "requirements", typeId: data.typeId, groups: gs.map((g) => g.map((c) => c.id)).filter((g) => g.length) }, flat(gs) === flat(data.groups));
  if (!editing) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          {COPY.decidedBy[w.decidedBy]} · {COPY.selects[w.selects]}
          <PendingMark pending={mergePending(pending.availabilityDecidedBy, pending.customerSelects)} />
        </p>
        <Field label={COPY.requirements} pending={pending.dependsOn}>{w.groups.length ? <Groups groups={w.groups} /> : <p className="text-muted-foreground">{COPY.noRequirements}</p>}</Field>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <PendingMark pending={mergePending(pending.availabilityDecidedBy, pending.customerSelects)} />
        <Select value={w.decidedBy} onValueChange={(v) => setSettings(v as "product" | "customization", w.selects)}>
          <SelectTrigger size="sm" className="w-auto" aria-label={COPY.decidedByLabel}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="product">{COPY.decidedBy.product}</SelectItem>
            <SelectItem value="customization">{COPY.decidedBy.customization}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={w.selects} onValueChange={(v) => setSettings(w.decidedBy, v as "one" | "many")}>
          <SelectTrigger size="sm" className="w-auto" aria-label={COPY.selectsLabel}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="one">{COPY.selects.one}</SelectItem>
            <SelectItem value="many">{COPY.selects.many}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Field label={COPY.requirements} pending={pending.dependsOn}>
        {w.groups.length ? (
          <Groups groups={w.groups}
            onRemove={(gi, cid) => setGroups(w.groups.map((g, i) => (i === gi ? g.filter((c) => c.id !== cid) : g)))}
            onRemoveGroup={(gi) => setGroups(w.groups.filter((_, i) => i !== gi))}
            adder={(gi) => <Picker choices={data.choices.filter((c) => !w.groups[gi]!.some((x) => x.id === c.id))} placeholder={COPY.addAlternative}
              onPick={(c) => setGroups(w.groups.map((g, i) => (i === gi ? [...g, c] : g)))} />} />
        ) : <p className="text-muted-foreground">{COPY.noRequirements}</p>}
        <Picker choices={data.choices} placeholder={COPY.addRequirement} onPick={(c) => setGroups([...w.groups, [c]])} />
      </Field>
    </div>
  );
}

// ── small pieces ──────────────────────────────────────────────────────────────────────────────

const Field = ({ label, pending, children }: { label: string; pending?: PendingField; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <PendingMark pending={pending} />
    </span>
    {children}
  </div>
);

/** Two fields changed together (a type's settings), as one mark. */
function mergePending(a?: PendingField, b?: PendingField): PendingField | undefined {
  if (!a || !b) return a ?? b;
  const frames = [...a.frames, ...b.frames.filter((f) => !a.frames.some((x) => x.id === f.id))].sort((x, y) => y.at.localeCompare(x.at));
  return { frames, refs: [...new Set([...a.refs, ...b.refs])] };
}

/**
 * "Pending" on a rule field with a change already waiting for approval (PROD-2962 scope 4): a link to
 * the newest such frame — the newest proposal wins (ADR-025), so it is the one that matters.
 */
function PendingMark({ pending }: { pending?: PendingField }) {
  if (!pending?.frames.length) return null;
  return (
    <Link
      href={`/spec/${pending.frames[0]!.id}`}
      title={COPY.pendingTitle(pending.frames.length)}
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
      {COPY.pendingMark}{pending.frames.length > 1 ? ` · ${pending.frames.length}` : ""}
    </Link>
  );
}

/** The amber dot on one entry of a list (an offered option, an exception) that a waiting frame changes. */
const EntryDot = ({ on }: { on: boolean }) =>
  on ? <span aria-label={COPY.pendingEntry} title={COPY.pendingEntry} className="size-1.5 shrink-0 rounded-full bg-amber-500" /> : null;

function Chips({ items, empty, onRemove, pendingRefs }: { items: Choice[]; empty: string; onRemove?: (id: string) => void; pendingRefs?: string[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <li key={c.id}>
          <Badge variant="secondary" className="gap-1 font-normal">
            <EntryDot on={Boolean(pendingRefs?.includes(c.id))} />
            {c.group ? <span className="text-muted-foreground">{c.group} ·</span> : null} {c.title}
            {onRemove ? (
              <button type="button" aria-label={COPY.remove(c.title)} onClick={() => onRemove(c.id)} className="ml-0.5 rounded hover:text-destructive">
                <X className="size-3" />
              </button>
            ) : null}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function ExceptionList({ items, onRemove, pendingRefs }: { items: Exc[]; onRemove?: (e: Exc) => void; pendingRefs?: string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((e) => (
        <li key={`${e.id}|${e.mode}`} className="flex items-start gap-2 text-sm">
          <Badge variant={e.mode === "add" ? "secondary" : "outline"}>{e.mode}</Badge>
          <span className="mt-1.5"><EntryDot on={Boolean(pendingRefs?.includes(e.id))} /></span>
          <span className="min-w-0 flex-1"><span className="font-medium">{e.title}</span> <span className="text-muted-foreground">— {e.reason || COPY.reasonMissing}</span></span>
          {onRemove ? <Button size="icon-xs" variant="ghost" aria-label={COPY.deleteException(e.title)} title={COPY.deleteException(e.title)} onClick={() => onRemove(e)}><Trash2 /></Button> : null}
        </li>
      ))}
    </ul>
  );
}

function Groups({ groups, onRemove, onRemoveGroup, adder }: { groups: Choice[][]; onRemove?: (g: number, id: string) => void; onRemoveGroup?: (g: number) => void; adder?: (g: number) => React.ReactNode }) {
  return (
    <ol className="flex flex-col gap-2">
      {groups.map((g, i) => (
        <li key={i} className="flex flex-col gap-1.5 rounded-md border border-border p-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{COPY.requirement(i + 1)}</span>
            {onRemoveGroup ? <Button size="xs" variant="ghost" onClick={() => onRemoveGroup(i)}>{COPY.removeRequirement}</Button> : null}
          </div>
          <Chips items={g} empty={COPY.emptyRequirement} onRemove={onRemove ? (id) => onRemove(i, id) : undefined} />
          {adder ? adder(i) : null}
        </li>
      ))}
    </ol>
  );
}

/** A search box over grouped choices. */
export function Picker({ choices, placeholder, onPick, className = "max-w-sm" }: { choices: Choice[]; placeholder: string; onPick: (c: Choice) => void; className?: string }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    return choices.filter((c) => c.title.toLowerCase().includes(n) || c.group.toLowerCase().includes(n)).slice(0, 12);
  }, [q, choices]);
  return (
    <div className={`relative w-full ${className}`}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQ("")} placeholder={placeholder} aria-label={placeholder} className="h-8" />
      {hits.length ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover text-sm shadow-md">
          {hits.map((c) => (
            <li key={c.id}>
              <button type="button" className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left hover:bg-muted" onClick={() => { onPick(c); setQ(""); }}>
                <Plus className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{c.group}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * This record's recent rule edits, with links (2026-10-14: after Submit & approve there was no way back
 * to the frame, nor a way to see a rule had already been changed).
 */
function RecordHistory({ id, title }: { id: string; title: string }) {
  const s = useRuleEditSession()!;
  const [rows, setRows] = useState<RecordEdit[] | null>(null);
  useEffect(() => {
    void loadRecordEdits(id, title).then((r) => setRows(r.ok ? r.data : []));
  }, [id, title, s.version]);
  if (!rows?.length) return null;
  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.historyTitle}</span>
      <ul className="flex flex-col gap-1 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-baseline gap-2">
            <Badge variant={r.state === "draft" ? "secondary" : "outline"} className="shrink-0">{r.state === "draft" ? "waiting" : r.state}</Badge>
            <span className="min-w-0 flex-1">
              {r.sentence}
              {r.more ? <span className="text-muted-foreground"> {COPY.historyMore(r.more)}</span> : null}
              <LocalTime iso={r.at} className="block text-xs text-muted-foreground" />
            </span>
            <Link href={`/spec/${r.id}`} className="shrink-0 text-xs font-medium text-primary hover:underline">{COPY.historyOpen}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
