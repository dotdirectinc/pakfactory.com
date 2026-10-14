"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Undo2 } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import { Input } from "@pakfactory/ui/components/input";
import { Textarea } from "@pakfactory/ui/components/textarea";
import { describeEdit, editKey, offerEdit, type RuleEditDraft, type RuleFocus, type RuleMeta } from "@/lib/spec/rule-edits";
import { loadRuleMeta, previewRuleEdits, submitRuleEditsAction, type Preview, type SubmitResult } from "@/app/(admin)/spec/rule-edit-actions";
import { ADMIN_SPEC_RULE_EDIT_COPY as COPY } from "@/lib/copy/spec";

/**
 * One set of rule edits, shared by everything on the page that shows rules (PROD-2962): the record
 * panel's editor and the Spec Map's diagram both read and change it, so an edit made in one shows in
 * the other before anything is saved. The impact check — and the focused record's state after the
 * edits, which the diagram draws — re-runs whenever the edits or the focus change.
 */
type Session = {
  edits: RuleEditDraft[];
  /** Add or replace an edit; `noop` (the edit puts things back as they were) removes it instead. */
  put: (e: RuleEditDraft, noop?: boolean) => void;
  remove: (key: string) => void;
  /** Make `productId` offer (or stop offering) `optionId`; `offeredNow` = what the rules say today. */
  setOffered: (productId: string, optionId: string, want: boolean, offeredNow: boolean) => boolean;
  clear: () => void;
  editing: boolean;
  setEditing: (b: boolean) => void;
  canEdit: boolean;
  meta: RuleMeta | null;
  names: (id: string) => string;
  addNames: (m: Record<string, string>) => void;
  focus: RuleFocus | null;
  setFocus: (f: RuleFocus | null) => void;
  preview: Preview | null;
  checking: boolean;
  previewError: string | null;
  ack: boolean;
  setAck: (b: boolean) => void;
  note: string;
  setNote: (s: string) => void;
  submit: (approve: boolean) => void;
  submitting: boolean;
  submitError: { error: string; errors?: string[] } | null;
  result: SubmitResult | null;
  /** Bumped after a successful submit, so views re-read the rules. */
  version: number;
  /** Ready to submit: edits, a settled impact, no blocking errors, warnings acknowledged. */
  ready: boolean;
};

const Ctx = createContext<Session | null>(null);
export const useRuleEditSession = () => useContext(Ctx);

export function RuleEditSessionProvider({ children }: { children: React.ReactNode }) {
  const [byKey, setByKey] = useState<Map<string, RuleEditDraft>>(new Map());
  const edits = useMemo(() => [...byKey.values()], [byKey]);
  const [editing, setEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [meta, setMeta] = useState<RuleMeta | null>(null);
  const nameMap = useRef(new Map<string, string>());
  const [, bumpNames] = useState(0);
  const [focus, setFocus] = useState<RuleFocus | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [ack, setAck] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<Session["submitError"]>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void loadRuleMeta().then((r) => {
      if (r.ok) { setCanEdit(r.data.canEdit); setMeta(r.data.meta); }
    });
  }, [version]);

  const put = useCallback((e: RuleEditDraft, noop = false) => {
    setResult(null);
    setByKey((m) => {
      const x = new Map(m);
      if (noop) x.delete(editKey(e));
      else x.set(editKey(e), e);
      return x;
    });
  }, []);
  const remove = useCallback((key: string) => setByKey((m) => { const x = new Map(m); x.delete(key); return x; }), []);
  const clear = useCallback(() => { setByKey(new Map()); setAck(false); setNote(""); setSubmitError(null); setEditing(false); }, []);
  const setOffered = useCallback((productId: string, optionId: string, want: boolean, offeredNow: boolean) => {
    setResult(null);
    // Back to what the rules say today: drop whatever edit changed it.
    if (want === offeredNow) {
      setByKey((m) => { const x = new Map(m); x.delete(`offer:${productId}:${optionId}`); x.delete(`exc:${productId}:${optionId}`); return x; });
      return true;
    }
    const e = meta ? offerEdit(meta, productId, optionId, want) : null;
    if (!e) return false;
    put(e);
    return true;
  }, [meta, put]);
  const addNames = useCallback((m: Record<string, string>) => {
    let changed = false;
    for (const [k, v] of Object.entries(m)) if (nameMap.current.get(k) !== v) { nameMap.current.set(k, v); changed = true; }
    if (changed) bumpNames((n) => n + 1);
  }, []);
  const names = useCallback((id: string) => nameMap.current.get(id) ?? preview?.names[id] ?? id, [preview]);

  // The impact check: debounced, re-run on any change to the edits or the focus.
  const editsKey = JSON.stringify(edits);
  const focusKey = focus ? `${focus.level}:${focus.id}` : "";
  useEffect(() => {
    setAck(false);
  }, [editsKey]);
  useEffect(() => {
    if (!edits.length) { setPreview(null); setPreviewError(null); return; }
    const t = window.setTimeout(() => startCheck(async () => {
      const r = await previewRuleEdits(edits, focus);
      if (r.ok) { setPreview(r.data); setPreviewError(null); } else setPreviewError(r.error);
    }), 350);
    return () => window.clearTimeout(t);
  }, [editsKey, focusKey]); // keyed by content, not identity

  // A preview for an older set of edits is not this set's: never offer to submit on it.
  const settled = preview !== null && preview.sentences.length === edits.length && !checking;
  const ready = edits.length > 0 && settled && preview!.errors.length === 0 && (preview!.warnings.length === 0 || ack) && !submitting;

  const submit = useCallback((approve: boolean) => startSubmit(async () => {
    setSubmitError(null);
    const r = await submitRuleEditsAction(edits, { approve, note: note.trim() || undefined });
    if (r.ok) {
      setResult(r);
      setByKey(new Map());
      setNote("");
      setEditing(false);
      setPreview(null);
      setVersion((v) => v + 1);
    } else setSubmitError({ error: r.error, errors: r.errors });
  }), [edits, note]);

  const value: Session = {
    edits, put, remove, setOffered, clear, editing, setEditing, canEdit, meta, names, addNames, focus, setFocus,
    preview, checking, previewError, ack, setAck, note, setNote, submit, submitting, submitError, result, version, ready,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** A session of one's own when there is none above (the Catalog record page). */
export function WithRuleEditSession({ children }: { children: React.ReactNode }) {
  return useRuleEditSession() ? <>{children}</> : <RuleEditSessionProvider>{children}</RuleEditSessionProvider>;
}

// ── shared pieces ─────────────────────────────────────────────────────────────────────────────

/** The sentence for edit `i`: the server's once it has answered for this set, otherwise our own. */
function sentenceOf(s: Session, e: RuleEditDraft, i: number) {
  return s.preview && s.preview.sentences.length === s.edits.length ? s.preview.sentences[i]! : describeEdit(e, s.names);
}

/** Pending changes: a sentence each, undo, and the reason for an exception (required). */
export function PendingTray({ compact = false }: { compact?: boolean }) {
  const s = useRuleEditSession()!;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.pending(s.edits.length)}</span>
      {s.edits.length ? (
        <ul className={`flex flex-col gap-1.5 text-sm ${compact ? "max-h-32 overflow-y-auto" : ""}`}>
          {s.edits.map((e, i) => (
            <li key={editKey(e)} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">{sentenceOf(s, e, i)}</span>
                <Button size="icon-xs" variant="ghost" aria-label={COPY.undo} title={COPY.undo} onClick={() => s.remove(editKey(e))}><Undo2 /></Button>
              </div>
              {e.kind === "exception" && e.reason !== null ? (
                <Input
                  value={e.reason}
                  onChange={(ev) => s.put({ ...e, reason: ev.target.value })}
                  placeholder={COPY.reasonFor(e.mode)}
                  aria-label={COPY.reasonFor(e.mode)}
                  className={`h-7 text-xs ${e.reason.trim() ? "" : "border-destructive"}`}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">{COPY.nothingYet}</p>}
    </div>
  );
}

/** The impact check in full: errors, per-product changes, warnings with the acknowledgement. */
export function ImpactBox() {
  const s = useRuleEditSession()!;
  if (!s.edits.length) return null;
  const p = s.preview;
  const n = (id: string) => p?.names[id] ?? s.names(id);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.impact}</span>
      {s.previewError ? <p className="text-destructive">{s.previewError}</p> : !p || s.checking ? <p className="text-muted-foreground">{COPY.checking}</p> : (
        <>
          {p.errors.map((e) => <p key={e} role="alert" className="text-destructive">✕ {e}</p>)}
          <p>{p.totals.products ? COPY.totals(p.totals) : COPY.noProductChange}</p>
          {p.products.length ? (
            <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-border p-2 text-xs">
              {p.products.slice(0, 60).map((x) => (
                <li key={x.id}>
                  <span className="font-medium">{x.title}</span>
                  {x.gained.length ? <span className="text-green-700 dark:text-green-400"> +{x.gained.map(n).join(", ")}</span> : null}
                  {x.lost.length ? <span className="text-red-700 dark:text-red-400"> −{x.lost.map(n).join(", ")}</span> : null}
                </li>
              ))}
              {p.products.length > 60 ? <li className="text-muted-foreground">{COPY.more(p.products.length - 60)}</li> : null}
            </ul>
          ) : null}
          {p.warnings.length ? (
            <div className="flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
              {p.warnings.map((w) => <p key={w.text} className="text-amber-800 dark:text-amber-300">⚠ {w.text}</p>)}
              <Acknowledge />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Acknowledge() {
  const s = useRuleEditSession()!;
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={s.ack} onCheckedChange={(v) => s.setAck(v === true)} />
      <span>{COPY.acknowledge}</span>
    </label>
  );
}

/** Submit for approval · Submit & approve · Cancel, and what came back. */
export function SubmitButtons() {
  const s = useRuleEditSession()!;
  return (
    <div className="flex flex-col gap-2">
      {s.submitError ? (
        <div role="alert" className="text-sm text-destructive">
          <p>{s.submitError.error}</p>
          {s.submitError.errors && s.submitError.errors.length > 1 ? <ul className="list-disc pl-5">{s.submitError.errors.slice(1).map((e) => <li key={e}>{e}</li>)}</ul> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={!s.ready} onClick={() => s.submit(false)}>{s.submitting ? COPY.submitting : COPY.submit}</Button>
        <Button size="sm" variant="secondary" disabled={!s.ready} onClick={() => s.submit(true)}>{COPY.submitApprove}</Button>
        <Button size="sm" variant="ghost" onClick={s.clear} disabled={s.submitting}>{COPY.cancel}</Button>
      </div>
    </div>
  );
}

export function SubmitResultNote() {
  const s = useRuleEditSession();
  const r = s?.result;
  if (!r?.ok) return null;
  return (
    <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
      {r.data.state === "approved" ? COPY.applied(r.data.written) : COPY.submitted}{" "}
      <Link href={`/spec/${r.data.changeset_id}`} className="font-medium underline-offset-2 hover:underline">{COPY.openFrame}</Link>
    </p>
  );
}

/** The panel's footer: tray, impact, note, buttons. */
export function RuleEditFooter() {
  const s = useRuleEditSession()!;
  return (
    <div className="flex flex-col gap-4">
      <PendingTray />
      <ImpactBox />
      <Textarea value={s.note} onChange={(e) => s.setNote(e.target.value)} placeholder={COPY.note} aria-label={COPY.note} rows={2} className="text-sm" />
      <SubmitButtons />
      <span className="text-xs text-muted-foreground">{COPY.devOnly}</span>
    </div>
  );
}

/** The Spec Map's bar under the diagram: the same set, short — count, impact line, acknowledgement, buttons. */
export function RuleEditBar() {
  const s = useRuleEditSession();
  if (!s || (!s.editing && !s.edits.length && !s.result?.ok)) return null;
  if (!s.editing && !s.edits.length) return <SubmitResultNote />;
  return <EditBar />;
}

function EditBar() {
  const s = useRuleEditSession()!;
  const [open, setOpen] = useState(false);
  const p = s.preview;
  const settled = p && !s.checking && p.sentences.length === s.edits.length;
  return (
    <div role="region" aria-label={COPY.barLabel} className="sticky bottom-0 z-20 flex flex-col rounded-md border border-foreground/20 bg-card text-sm shadow-sm">
      {/* The details the panel shows — every pending change (with undo and reasons) and the full impact. */}
      {open && s.edits.length ? (
        <div className="grid max-h-[40vh] gap-4 overflow-y-auto border-b border-border p-3 md:grid-cols-2">
          <PendingTray />
          <ImpactBox />
        </div>
      ) : null}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
      <span className="font-medium text-foreground">{s.edits.length ? COPY.pending(s.edits.length) : COPY.editingHint}</span>
      {s.edits.length ? (
        <span className="text-muted-foreground">
          {s.previewError ? <span className="text-destructive">{s.previewError}</span>
            : !settled ? COPY.checking
            : p.errors.length ? <span className="text-destructive">{p.errors[0]}{p.errors.length > 1 ? ` ${COPY.barMoreErrors(p.errors.length - 1)}` : ""}</span>
            : p.totals.products ? COPY.totals(p.totals) : COPY.noProductChange}
        </span>
      ) : null}
      {settled && p.warnings.length && !p.errors.length ? (
        <span className="flex items-center gap-2 text-amber-800 dark:text-amber-300">⚠ {COPY.barWarnings(p.warnings.length)} <Acknowledge /></span>
      ) : null}
      {s.edits.length ? (
        <Button size="xs" variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown /> : <ChevronUp />} {open ? COPY.hideDetails : COPY.showDetails}
        </Button>
      ) : null}
      <div className="ml-auto"><SubmitButtons /></div>
    </div>
    </div>
  );
}
