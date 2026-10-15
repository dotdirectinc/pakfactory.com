"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowUp, X } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@pakfactory/ui/components/select";
import { Textarea } from "@pakfactory/ui/components/textarea";
import type { TableKey } from "@/lib/spec/catalog-table-model";
import type { Choice } from "@/lib/spec/rule-editor-data";
import { editKey, isMove, moveSubject, type MoveDraft } from "@/lib/spec/rule-edits";
import { loadParents, type ParentsData } from "@/app/(admin)/spec/rule-edit-actions";
import { ImpactBox, PendingTray, SubmitResultNote, useRuleEditSession } from "@/components/spec/rule-edit-session";
import { ADMIN_SPEC_PARENTS_COPY as COPY, ADMIN_SPEC_RULE_EDIT_COPY as EDIT } from "@/lib/copy/spec";

/**
 * A record's parents and children, and moving it (PROD-3007, ADR-026). On a record page, **Move** (like
 * Edit rules) turns the parents into dropdowns of every possible one and lets a record be added under this
 * one; the moves collect in the page's rule-edit session — the same pending set, impact check and frame
 * as the rule edits — with Submit for approval, Submit & approve and Cancel under the section. On the
 * Spec Map the map's Move records mode is the way in, and its bar takes the place of these buttons.
 */
const LEVELS = new Set<TableKey>(["product", "inspiration", "productStyle", "customizationOption", "customizationType", "productLine", "customizationCategory", "solution"]);

export function SpecParentsEditor({ level, id, footer, onEdit }: {
  level: TableKey;
  id: string;
  /** The record page: its own Move mode and buttons. Off in the Spec Map's panel. */
  footer: boolean;
  /** The Spec Map's way into moving (its Move records mode). */
  onEdit?: () => void;
}) {
  const s = useRuleEditSession();
  const [data, setData] = useState<ParentsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [, start] = useTransition();
  const version = s?.version ?? 0;
  useEffect(() => {
    if (!LEVELS.has(level)) return;
    start(async () => {
      const r = await loadParents(level, id);
      if (r.ok) { setData(r.data); setError(null); } else setError(r.error);
    });
  }, [level, id, version]);
  // A submit ends the page's Move mode (the session bumps its version and empties).
  useEffect(() => { if (version) setMoving(false); }, [version]);

  const names = useMemo(() => {
    if (!data) return {};
    const c = data.choices;
    return Object.fromEntries([...c.lines, ...c.styles, ...c.solutions, ...c.types, ...c.categories, ...c.bases, ...(data.children?.add ?? []), ...(data.children?.items ?? [])].map((x) => [x.id, x.title]));
  }, [data]);
  const addNames = s?.addNames;
  useEffect(() => { if (addNames && Object.keys(names).length) addNames(names); }, [names, addNames]);

  if (!LEVELS.has(level) || !s) return null;
  if (error) return <p className="text-sm text-destructive">{COPY.unreachable} ({error})</p>;
  if (!data) return <p className="text-sm text-muted-foreground">{COPY.loading}</p>;
  if (data.kind === "none") return null;

  // On the Map, its Move records mode (the session's editing); on a page, this section's own Move mode.
  const editing = data.canEdit && (onEdit ? s.editing : moving);
  const pending = s.edits.some((e) => isMove(e) && (moveSubject(e) === id || Object.values(e).includes(id)));
  const cancel = () => {
    for (const e of s.edits) if (isMove(e)) s.remove(editKey(e));
    setMoving(false);
  };

  return (
    <section className={`flex flex-col gap-3 rounded-md border bg-card p-4 ${editing && !onEdit ? "border-primary/50 ring-1 ring-primary/30" : "border-border"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          {COPY.title}
          {pending ? <Badge variant="outline" className="border-amber-500/60 text-amber-800 dark:text-amber-300">{COPY.pending}</Badge> : null}
        </h3>
        {data.canEdit && !editing ? (
          <Button size="sm" variant="outline" disabled={s.refreshing || (!onEdit && s.editing)} onClick={onEdit ?? (() => setMoving(true))}>
            {s.refreshing ? EDIT.refreshing : COPY.move}
          </Button>
        ) : null}
      </div>
      {footer ? <SubmitResultNote /> : null}
      <p className="text-xs text-muted-foreground">{editing ? COPY.movingHint : COPY.readOnly}</p>
      <Fields data={data} id={id} editing={editing} />
      {data.children ? <Children data={data} id={id} editing={editing} /> : null}
      {editing && footer && !onEdit ? (
        <div className="flex flex-col gap-4 border-t border-border pt-3">
          <PendingTray />
          <ImpactBox />
          <Textarea value={s.note} onChange={(e) => s.setNote(e.target.value)} placeholder={EDIT.note} aria-label={EDIT.note} rows={2} className="text-sm" />
          {s.submitError ? (
            <div role="alert" className="text-sm text-destructive">
              <p>{s.submitError.error}</p>
              {s.submitError.errors && s.submitError.errors.length > 1 ? <ul className="list-disc pl-5">{s.submitError.errors.slice(1).map((e) => <li key={e}>{e}</li>)}</ul> : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!s.ready} onClick={() => s.submit(false)}>{s.submitting ? EDIT.submitting : EDIT.submit}</Button>
            <Button size="sm" variant="secondary" disabled={!s.ready} onClick={() => s.submit(true)}>{EDIT.submitApprove}</Button>
            <Button size="sm" variant="ghost" disabled={s.submitting} onClick={cancel}>{EDIT.cancel}</Button>
          </div>
          <span className="text-xs text-muted-foreground">{EDIT.devOnly}</span>
        </div>
      ) : null}
    </section>
  );
}

/** The record's parents with the session's moves applied; dropdowns while moving. */
function Fields({ data, id, editing }: { data: ParentsData; id: string; editing: boolean }) {
  const s = useRuleEditSession()!;
  const c = data.choices;
  const title = (list: Choice[], x?: string) => (x ? list.find((y) => y.id === x)?.title ?? x : COPY.none);
  const moveOf = <K extends MoveDraft["kind"]>(kind: K) =>
    s.edits.find((e): e is Extract<MoveDraft, { kind: K }> => e.kind === kind && moveSubject(e as MoveDraft) === id);
  const cur = data.current;

  if (data.kind === "standard") {
    const p = moveOf("placement");
    const lineId = p?.lineId ?? cur.lineId;
    const styleIds = p?.styleIds ?? cur.styleIds ?? [];
    const place = (line: string | undefined, styles: string[]) => {
      if (!line) return;
      const back = line === cur.lineId && same(styles, cur.styleIds ?? []);
      s.put({ kind: "placement", productId: id, lineId: line, styleIds: styles }, back);
    };
    const inLine = c.styles.filter((x) => x.lineId === lineId);
    return (
      <dl className="grid gap-3 text-sm">
        <Row label={COPY.line}>
          {editing ? (
            <ParentSelect value={lineId} choices={c.lines} placeholder={COPY.pickLine2}
              onChange={(l) => place(l, styleIds.filter((x) => c.styles.find((y) => y.id === x)?.lineId === l))} />
          ) : <span className="font-medium">{title(c.lines, lineId)}</span>}
        </Row>
        <Row label={COPY.styles}>
          <OrderedList ids={styleIds} names={(x) => title(c.styles, x)} editing={editing} onChange={(ids) => place(lineId, ids)} empty={COPY.noStyle}
            swap={editing ? (x) => inLine.filter((y) => y.id === x || !styleIds.includes(y.id)) : undefined} placeholder={COPY.pickStyle} />
          {editing ? <ParentSelect value={undefined} choices={inLine.filter((x) => !styleIds.includes(x.id))} placeholder={COPY.addStyle} onChange={(x) => place(lineId, [...styleIds, x])} /> : null}
        </Row>
        <SolutionsRow data={data} id={id} editing={editing} />
      </dl>
    );
  }
  if (data.kind === "inspiration") {
    const b = moveOf("basedOn");
    const baseId = b?.baseId ?? cur.baseId;
    return (
      <dl className="grid gap-3 text-sm">
        <Row label={COPY.base}>
          {editing ? (
            <ParentSelect value={baseId} choices={c.bases} placeholder={COPY.pickBase2} onChange={(x) => s.put({ kind: "basedOn", productId: id, baseId: x }, x === cur.baseId)} />
          ) : <span className="font-medium">{title(c.bases, baseId)}</span>}
        </Row>
        <SolutionsRow data={data} id={id} editing={editing} />
      </dl>
    );
  }
  if (data.kind === "style") {
    const m = moveOf("styleLine");
    const lineId = m?.lineId ?? cur.lineId;
    return (
      <dl className="grid gap-3 text-sm">
        <Row label={COPY.line}>
          {editing ? (
            <ParentSelect value={lineId} choices={c.lines} placeholder={COPY.pickLine2} onChange={(x) => s.put({ kind: "styleLine", styleId: id, lineId: x }, x === cur.lineId)} />
          ) : <span className="font-medium">{title(c.lines, lineId)}</span>}
        </Row>
      </dl>
    );
  }
  if (data.kind === "option") {
    const m = moveOf("optionType");
    const typeId = m?.typeId ?? cur.typeId;
    return (
      <dl className="grid gap-3 text-sm">
        <Row label={COPY.type}>
          {editing ? (
            <ParentSelect value={typeId} choices={c.types} placeholder={COPY.pickType2} onChange={(x) => s.put({ kind: "optionType", optionId: id, typeId: x }, x === cur.typeId)} />
          ) : <span className="font-medium">{title(c.types, typeId)}</span>}
        </Row>
      </dl>
    );
  }
  if (data.kind === "type") {
    const m = moveOf("typeCategory");
    const categoryId = m?.categoryId ?? cur.categoryId;
    return (
      <dl className="grid gap-3 text-sm">
        <Row label={COPY.category}>
          {editing ? (
            <ParentSelect value={categoryId} choices={c.categories} placeholder={COPY.pickCategory2} onChange={(x) => s.put({ kind: "typeCategory", typeId: id, categoryId: x }, x === cur.categoryId)} />
          ) : <span className="font-medium">{title(c.categories, categoryId)}</span>}
        </Row>
      </dl>
    );
  }
  return null; // a line, category or solution: no parent, only children
}

/** The records under this one; while moving, a dropdown of every record that could be moved under it. */
function Children({ data, id, editing }: { data: ParentsData; id: string; editing: boolean }) {
  const s = useRuleEditSession()!;
  const ch = data.children!;
  const keys = new Set(s.edits.filter(isMove).map(editKey));
  // Added here and still pending: shown with the others, marked.
  const added = ch.add.filter((x) => keys.has(editKey(x.move)) && JSON.stringify(s.edits.find((e) => editKey(e) === editKey(x.move))) === JSON.stringify(x.move));
  const [all, setAll] = useState(false);
  const shown = all ? ch.items : ch.items.slice(0, 12);
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-start">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pt-0.5">{COPY.titleChildren(ch.label)}</dt>
      <dd className="flex flex-col gap-1.5 text-sm">
        {ch.items.length || added.length ? (
          <ul className="flex flex-col gap-0.5">
            {added.map((x) => (
              <li key={x.id} className="flex items-center gap-2">
                <span className="font-medium">{x.title}</span>
                <Badge variant="outline" className="border-amber-500/60 text-[10px] text-amber-800 dark:text-amber-300">{COPY.pendingChild}</Badge>
                {editing ? <Button size="icon-xs" variant="ghost" aria-label={`${COPY.remove}: ${x.title}`} title={COPY.remove} onClick={() => s.remove(editKey(x.move))}><X /></Button> : null}
              </li>
            ))}
            {shown.map((x) => <li key={x.id}>{x.title}</li>)}
            {ch.items.length > shown.length ? (
              <li><button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setAll(true)}>{COPY.andMore(ch.items.length - shown.length)}</button></li>
            ) : null}
          </ul>
        ) : <span className="text-muted-foreground">{COPY.noChildren}</span>}
        {editing ? (
          <ParentSelect value={undefined} choices={ch.add.filter((x) => !added.includes(x))} placeholder={COPY.addChild(ch.label)}
            onChange={(x) => { const m = ch.add.find((y) => y.id === x); if (m && m.move) s.put(m.move); }} />
        ) : null}
      </dd>
    </div>
  );
}

function SolutionsRow({ data, id, editing }: { data: ParentsData; id: string; editing: boolean }) {
  const s = useRuleEditSession()!;
  const c = data.choices;
  const m = s.edits.find((e) => e.kind === "solutions" && e.productId === id) as Extract<MoveDraft, { kind: "solutions" }> | undefined;
  const ids = m?.solutionIds ?? data.current.solutionIds ?? [];
  const set = (next: string[]) => s.put({ kind: "solutions", productId: id, solutionIds: next }, same(next, data.current.solutionIds ?? []));
  return (
    <Row label={COPY.solutions}>
      <OrderedList ids={ids} names={(x) => c.solutions.find((y) => y.id === x)?.title ?? x} editing={editing} onChange={set} empty={COPY.none}
        swap={editing ? (x) => c.solutions.filter((y) => y.id === x || !ids.includes(y.id)) : undefined} placeholder={COPY.pickSolution} />
      {editing ? <ParentSelect value={undefined} choices={c.solutions.filter((x) => !ids.includes(x.id))} placeholder={COPY.addSolution} onChange={(x) => set([...ids, x])} /> : null}
    </Row>
  );
}

/**
 * An ordered list of parents: the first is the primary. While moving, each entry is a dropdown (`swap`
 * gives its choices), with make-primary and remove.
 */
function OrderedList({ ids, names, editing, onChange, empty, swap, placeholder }: {
  ids: string[]; names: (id: string) => string; editing: boolean; onChange: (ids: string[]) => void; empty: string;
  swap?: (id: string) => Choice[]; placeholder: string;
}) {
  if (!ids.length) return <span className="text-muted-foreground">{empty}</span>;
  return (
    <ol className="flex flex-col gap-1">
      {ids.map((x, i) => (
        <li key={x} className="flex items-center gap-2">
          {editing && swap ? (
            <ParentSelect value={x} choices={swap(x)} placeholder={placeholder} onChange={(y) => onChange(ids.map((z) => (z === x ? y : z)))} />
          ) : <span className={i === 0 ? "font-medium" : ""}>{names(x)}</span>}
          {i === 0 && ids.length > 1 ? <Badge variant="secondary" className="shrink-0 text-[10px]">{COPY.primary}</Badge> : null}
          {editing && i > 0 ? (
            <Button size="icon-xs" variant="ghost" aria-label={`${COPY.makePrimary}: ${names(x)}`} title={COPY.makePrimary} onClick={() => onChange([x, ...ids.filter((y) => y !== x)])}><ArrowUp /></Button>
          ) : null}
          {editing ? (
            <Button size="icon-xs" variant="ghost" aria-label={`${COPY.remove}: ${names(x)}`} title={COPY.remove} onClick={() => onChange(ids.filter((y) => y !== x))}><X /></Button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** A dropdown of every possible parent (or child), grouped, scrollable. */
function ParentSelect({ value, choices, placeholder, onChange }: { value: string | undefined; choices: Choice[]; placeholder: string; onChange: (id: string) => void }) {
  // An "Add…" dropdown (no value) starts over after each pick.
  const [round, setRound] = useState(0);
  const groups = useMemo(() => {
    const m = new Map<string, Choice[]>();
    for (const c of [...choices].sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title))) m.set(c.group, [...(m.get(c.group) ?? []), c]);
    return [...m];
  }, [choices]);
  return (
    <Select key={value ?? `add-${round}`} value={value} onValueChange={(v) => { onChange(v); if (value === undefined) setRound((r) => r + 1); }}>
      <SelectTrigger size="sm" className="w-full max-w-sm" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {groups.map(([g, items]) => (
          <SelectGroup key={g}>
            {groups.length > 1 ? <SelectLabel>{g}</SelectLabel> : null}
            {items.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-start">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="flex flex-col gap-1.5">{children}</dd>
    </div>
  );
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
