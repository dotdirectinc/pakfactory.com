"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Undo2, X } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import { Input } from "@pakfactory/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@pakfactory/ui/components/select";
import { Textarea } from "@pakfactory/ui/components/textarea";
import type { TableKey } from "@/lib/spec/catalog-table-model";
import { describeEdit, type Impact, type RuleEditDraft } from "@/lib/spec/rule-edits";
import type { Choice, RuleEditorData } from "@/lib/spec/rule-editor-data";
import { loadRuleEditor, previewRuleEdits, submitRuleEditsAction, type SubmitResult } from "@/app/(admin)/spec/rule-edit-actions";
import { ADMIN_SPEC_RULE_EDIT_COPY as COPY } from "@/lib/copy/spec";

/**
 * The customization rules of one record, and editing them (PROD-2962, ADR-025). Shared by the
 * Catalog record page and the Spec Map panel through SpecRecordView. Edits are the difference
 * between the record's rules and the working copy, so undoing a change simply removes it.
 * Before anything is submitted the impact check runs the storefront's own engine on every standard
 * product; blocking errors stop the submit and warnings need an acknowledgement.
 */
type Data = RuleEditorData & { canEdit: boolean };
type Exc = Choice & { mode: "add" | "remove"; reason: string };

export function SpecRuleEditor({ level, id, title }: { level: TableKey; id: string; title: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [, start] = useTransition();
  const reload = () => start(async () => {
    const r = await loadRuleEditor(level, id);
    if (r.ok) { setData(r.data); setLoadError(null); } else setLoadError(r.error);
  });
  useEffect(reload, [level, id]);

  if (level !== "product" && level !== "customizationOption" && level !== "customizationType") return null;
  if (loadError) return <p className="text-sm text-destructive">{COPY.unreachable} ({loadError})</p>;
  if (!data) return <p className="text-sm text-muted-foreground">{COPY.loading}</p>;

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{COPY.title}</h3>
        {data.kind !== "none" && data.canEdit && !editing ? (
          <Button size="sm" variant="outline" onClick={() => { setEditing(true); setResult(null); }}>{COPY.edit}</Button>
        ) : null}
      </div>
      {result?.ok ? (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          {result.data.state === "approved" ? COPY.applied(result.data.written) : COPY.submitted}{" "}
          <Link href={`/spec/${result.data.changeset_id}`} className="font-medium underline-offset-2 hover:underline">{COPY.openFrame}</Link>
        </p>
      ) : null}
      {data.kind === "none" ? (
        <p className="text-sm text-muted-foreground">{data.reason}</p>
      ) : editing ? (
        <Editor data={data} title={title} onCancel={() => setEditing(false)} onDone={(r) => { setResult(r); setEditing(false); reload(); }} />
      ) : (
        <Current data={data} />
      )}
    </section>
  );
}

// ── read-only ─────────────────────────────────────────────────────────────────────────────────

function Chips({ items, empty, onRemove }: { items: Choice[]; empty: string; onRemove?: (id: string) => void }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <li key={c.id}>
          <Badge variant="secondary" className="gap-1 font-normal">
            <span className="text-muted-foreground">{c.group} ·</span> {c.title}
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

function Current({ data }: { data: Data }) {
  if (data.kind === "product") return (
    <div className="flex flex-col gap-3 text-sm">
      <Field label={COPY.offers}><Chips items={data.offers} empty={COPY.noOffers} /></Field>
      <Field label={COPY.exceptions}>{data.exceptions.length ? <ExceptionList items={data.exceptions} /> : <p className="text-muted-foreground">{COPY.noExceptions}</p>}</Field>
    </div>
  );
  if (data.kind === "option") return <Field label={COPY.compatible}><Chips items={data.compatible} empty={COPY.noCompatible} /></Field>;
  if (data.kind === "type") return (
    <div className="flex flex-col gap-2 text-sm">
      <p>{COPY.decidedBy[data.decidedBy]} · {COPY.selects[data.customerSelects]}</p>
      <Field label={COPY.requirements}>{data.groups.length ? <Groups groups={data.groups} /> : <p className="text-muted-foreground">{COPY.noRequirements}</p>}</Field>
    </div>
  );
  return null;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    {children}
  </div>
);

function ExceptionList({ items, onRemove }: { items: Exc[]; onRemove?: (e: Exc) => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((e) => (
        <li key={`${e.id}|${e.mode}`} className="flex items-start gap-2 text-sm">
          <Badge variant={e.mode === "add" ? "secondary" : "outline"}>{e.mode}</Badge>
          <span className="min-w-0 flex-1"><span className="font-medium">{e.title}</span> <span className="text-muted-foreground">— {e.reason}</span></span>
          {onRemove ? <Button size="icon-xs" variant="ghost" aria-label={COPY.remove(e.title)} onClick={() => onRemove(e)}><X /></Button> : null}
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

// ── picker: a search box over grouped choices ─────────────────────────────────────────────────

function Picker({ choices, placeholder, onPick }: { choices: Choice[]; placeholder: string; onPick: (c: Choice) => void }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    return choices.filter((c) => c.title.toLowerCase().includes(n) || c.group.toLowerCase().includes(n)).slice(0, 12);
  }, [q, choices]);
  return (
    <div className="relative w-full max-w-sm">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-8" />
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

// ── the editor ────────────────────────────────────────────────────────────────────────────────

function Editor({ data, title, onCancel, onDone }: { data: Exclude<Data, { kind: "none" }>; title: string; onCancel: () => void; onDone: (r: SubmitResult) => void }) {
  // Working copies.
  const [offers, setOffers] = useState<Choice[]>(data.kind === "product" ? data.offers : []);
  const [exceptions, setExceptions] = useState<Exc[]>(data.kind === "product" ? data.exceptions : []);
  const [compatible, setCompatible] = useState<Choice[]>(data.kind === "option" ? data.compatible : []);
  const [decidedBy, setDecidedBy] = useState(data.kind === "type" ? data.decidedBy : "product");
  const [selects, setSelects] = useState(data.kind === "type" ? data.customerSelects : "one");
  const [groups, setGroups] = useState<Choice[][]>(data.kind === "type" ? data.groups : []);
  const [newExc, setNewExc] = useState<{ mode: "add" | "remove"; option: Choice | null; reason: string }>({ mode: "remove", option: null, reason: "" });

  // Names for sentences: every choice we know, plus this record.
  const names = useMemo(() => {
    const m = new Map<string, string>();
    const all: Choice[] = data.kind === "product" ? [...data.offers, ...data.offerChoices, ...data.exceptionChoices, ...data.exceptions]
      : data.kind === "option" ? [...data.compatible, ...data.choices] : [...data.choices, ...data.groups.flat()];
    for (const c of all) m.set(c.id, c.title);
    m.set(data.kind === "product" ? data.productId : data.kind === "option" ? data.optionId : data.typeId, title);
    return m;
  }, [data, title]);
  const name = (id: string) => names.get(id) ?? id;

  // Edits = working copy − original.
  const edits = useMemo<RuleEditDraft[]>(() => {
    if (data.kind === "product") {
      const was = new Set(data.offers.map((o) => o.id));
      const now = new Set(offers.map((o) => o.id));
      const out: RuleEditDraft[] = [
        ...[...now].filter((x) => !was.has(x)).map((optionId) => ({ kind: "offer" as const, productId: data.productId, optionId, offered: true })),
        ...[...was].filter((x) => !now.has(x)).map((optionId) => ({ kind: "offer" as const, productId: data.productId, optionId, offered: false })),
      ];
      const k = (e: Exc) => `${e.id}|${e.mode}`;
      const before = new Map(data.exceptions.map((e) => [k(e), e]));
      const after = new Map(exceptions.map((e) => [k(e), e]));
      for (const [key, e] of before) if (!after.has(key)) out.push({ kind: "exception", productId: data.productId, optionId: e.id, mode: e.mode, reason: null });
      for (const [key, e] of after) if (before.get(key)?.reason !== e.reason) out.push({ kind: "exception", productId: data.productId, optionId: e.id, mode: e.mode, reason: e.reason });
      return out;
    }
    if (data.kind === "option") {
      const was = new Set(data.compatible.map((o) => o.id));
      const now = new Set(compatible.map((o) => o.id));
      return [
        ...[...now].filter((x) => !was.has(x)).map((b) => ({ kind: "pair" as const, a: data.optionId, b, compatible: true })),
        ...[...was].filter((x) => !now.has(x)).map((b) => ({ kind: "pair" as const, a: data.optionId, b, compatible: false })),
      ];
    }
    const out: RuleEditDraft[] = [];
    if (decidedBy !== data.decidedBy || selects !== data.customerSelects) {
      out.push({ kind: "typeSettings", typeId: data.typeId, ...(decidedBy !== data.decidedBy ? { decidedBy } : {}), ...(selects !== data.customerSelects ? { customerSelects: selects } : {}) });
    }
    const flat = (gs: Choice[][]) => JSON.stringify(gs.map((g) => g.map((c) => c.id).sort()).filter((g) => g.length));
    if (flat(groups) !== flat(data.groups)) out.push({ kind: "requirements", typeId: data.typeId, groups: groups.map((g) => g.map((c) => c.id)).filter((g) => g.length) });
    return out;
  }, [data, offers, exceptions, compatible, decidedBy, selects, groups]);

  /** Undo one edit by putting the working copy back for it. */
  const undo = (e: RuleEditDraft) => {
    if (data.kind === "product" && e.kind === "offer") {
      setOffers((o) => (e.offered ? o.filter((x) => x.id !== e.optionId) : [...o, data.offers.find((x) => x.id === e.optionId)!]));
    } else if (data.kind === "product" && e.kind === "exception") {
      const orig = data.exceptions.find((x) => x.id === e.optionId && x.mode === e.mode);
      setExceptions((xs) => [...xs.filter((x) => !(x.id === e.optionId && x.mode === e.mode)), ...(orig ? [orig] : [])]);
    } else if (data.kind === "option" && e.kind === "pair") {
      setCompatible((c) => (e.compatible ? c.filter((x) => x.id !== e.b) : [...c, data.compatible.find((x) => x.id === e.b)!]));
    } else if (data.kind === "type" && e.kind === "typeSettings") {
      setDecidedBy(data.decidedBy);
      setSelects(data.customerSelects);
    } else if (data.kind === "type" && e.kind === "requirements") {
      setGroups(data.groups);
    }
  };

  // The impact check, re-run when the edits change.
  const [impact, setImpact] = useState<(Impact & { names: Record<string, string> }) | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const editsKey = JSON.stringify(edits);
  useEffect(() => {
    setImpact(null);
    if (!edits.length) return;
    const t = window.setTimeout(() => startCheck(async () => {
      const r = await previewRuleEdits(edits);
      if (r.ok) { setImpact(r.data); setImpactError(null); } else setImpactError(r.error);
    }), 400);
    return () => window.clearTimeout(t);
  }, [editsKey]);

  const [ack, setAck] = useState(false);
  useEffect(() => setAck(false), [editsKey]);
  const [note, setNote] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<{ error: string; errors?: string[] } | null>(null);
  const needsAck = (impact?.warnings.length ?? 0) > 0;
  const blocked = !edits.length || checking || !impact || impact.errors.length > 0 || (needsAck && !ack) || submitting;
  const submit = (approve: boolean) => startSubmit(async () => {
    setSubmitError(null);
    const r = await submitRuleEditsAction(edits, { approve, note: note.trim() || undefined });
    if (r.ok) onDone(r);
    else setSubmitError({ error: r.error, errors: r.errors });
  });
  const n = (id: string) => impact?.names[id] ?? name(id);

  return (
    <div className="flex flex-col gap-4">
      {data.kind === "product" ? (
        <>
          <Field label={COPY.offers}>
            <Chips items={offers} empty={COPY.noOffers} onRemove={(oid) => setOffers((o) => o.filter((x) => x.id !== oid))} />
            <Picker choices={data.offerChoices.filter((c) => !offers.some((o) => o.id === c.id)).concat(data.offers.filter((o) => !offers.some((x) => x.id === o.id)))}
              placeholder={COPY.addOffer} onPick={(c) => setOffers((o) => [...o, c])} />
          </Field>
          <Field label={COPY.exceptions}>
            {exceptions.length ? <ExceptionList items={exceptions} onRemove={(e) => setExceptions((xs) => xs.filter((x) => !(x.id === e.id && x.mode === e.mode)))} /> : <p className="text-sm text-muted-foreground">{COPY.noExceptions}</p>}
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
                  const o = newExc.option!;
                  setExceptions((xs) => [...xs.filter((x) => !(x.id === o.id && x.mode === newExc.mode)), { ...o, mode: newExc.mode, reason: newExc.reason.trim() }]);
                  setNewExc({ mode: newExc.mode, option: null, reason: "" });
                }}>{COPY.addException}</Button>
            </div>
          </Field>
        </>
      ) : data.kind === "option" ? (
        <Field label={COPY.compatible}>
          <Chips items={compatible} empty={COPY.noCompatible} onRemove={(cid) => setCompatible((c) => c.filter((x) => x.id !== cid))} />
          <Picker choices={data.choices.filter((c) => !compatible.some((x) => x.id === c.id)).concat(data.compatible.filter((o) => !compatible.some((x) => x.id === o.id)))}
            placeholder={COPY.addCompatible} onPick={(c) => setCompatible((x) => [...x, c])} />
        </Field>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Select value={decidedBy} onValueChange={(v) => setDecidedBy(v as "product" | "customization")}>
              <SelectTrigger size="sm" className="w-auto" aria-label={COPY.decidedByLabel}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="product">{COPY.decidedBy.product}</SelectItem>
                <SelectItem value="customization">{COPY.decidedBy.customization}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selects} onValueChange={(v) => setSelects(v as "one" | "many")}>
              <SelectTrigger size="sm" className="w-auto" aria-label={COPY.selectsLabel}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="one">{COPY.selects.one}</SelectItem>
                <SelectItem value="many">{COPY.selects.many}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label={COPY.requirements}>
            {groups.length ? (
              <Groups groups={groups}
                onRemove={(gi, cid) => setGroups((gs) => gs.map((g, i) => (i === gi ? g.filter((c) => c.id !== cid) : g)))}
                onRemoveGroup={(gi) => setGroups((gs) => gs.filter((_, i) => i !== gi))}
                adder={(gi) => <Picker choices={data.choices.filter((c) => !groups[gi]!.some((x) => x.id === c.id))} placeholder={COPY.addAlternative}
                  onPick={(c) => setGroups((gs) => gs.map((g, i) => (i === gi ? [...g, c] : g)))} />} />
            ) : <p className="text-sm text-muted-foreground">{COPY.noRequirements}</p>}
            <Picker choices={data.choices} placeholder={COPY.addRequirement} onPick={(c) => setGroups((gs) => [...gs, [c]])} />
          </Field>
        </>
      )}

      {/* The pending tray */}
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.pending(edits.length)}</span>
        {edits.length ? (
          <ul className="flex flex-col gap-1 text-sm">
            {edits.map((e, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="min-w-0 flex-1">{describeEdit(e, name)}</span>
                <Button size="icon-xs" variant="ghost" aria-label={COPY.undo} onClick={() => undo(e)}><Undo2 /></Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">{COPY.nothingYet}</p>}
      </div>

      {/* The impact check */}
      {edits.length ? (
        <div className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.impact}</span>
          {impactError ? <p className="text-destructive">{impactError}</p> : !impact || checking ? <p className="text-muted-foreground">{COPY.checking}</p> : (
            <>
              {impact.errors.map((e) => <p key={e} role="alert" className="text-destructive">✕ {e}</p>)}
              <p>{impact.totals.products ? COPY.totals(impact.totals) : COPY.noProductChange}</p>
              {impact.products.length ? (
                <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-border p-2 text-xs">
                  {impact.products.slice(0, 60).map((p) => (
                    <li key={p.id}>
                      <span className="font-medium">{p.title}</span>
                      {p.gained.length ? <span className="text-green-700 dark:text-green-400"> +{p.gained.map(n).join(", ")}</span> : null}
                      {p.lost.length ? <span className="text-red-700 dark:text-red-400"> −{p.lost.map(n).join(", ")}</span> : null}
                    </li>
                  ))}
                  {impact.products.length > 60 ? <li className="text-muted-foreground">{COPY.more(impact.products.length - 60)}</li> : null}
                </ul>
              ) : null}
              {impact.warnings.length ? (
                <div className="flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
                  {impact.warnings.map((w) => <p key={w.text} className="text-amber-800 dark:text-amber-300">⚠ {w.text}</p>)}
                  <label className="mt-1 flex items-center gap-2">
                    <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} />
                    <span>{COPY.acknowledge}</span>
                  </label>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={COPY.note} aria-label={COPY.note} rows={2} className="text-sm" />
      {submitError ? (
        <div role="alert" className="text-sm text-destructive">
          <p>{submitError.error}</p>
          {submitError.errors && submitError.errors.length > 1 ? <ul className="list-disc pl-5">{submitError.errors.slice(1).map((e) => <li key={e}>{e}</li>)}</ul> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={blocked} onClick={() => submit(false)}>{submitting ? COPY.submitting : COPY.submit}</Button>
        <Button size="sm" variant="secondary" disabled={blocked} onClick={() => submit(true)}>{COPY.submitApprove}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>{COPY.cancel}</Button>
        <span className="text-xs text-muted-foreground">{COPY.devOnly}</span>
      </div>
    </div>
  );
}
