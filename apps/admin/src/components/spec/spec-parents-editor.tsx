"use client";

import { createContext, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowUp, X } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@pakfactory/ui/components/select";
import { Textarea } from "@pakfactory/ui/components/textarea";
import type { TableKey } from "@/lib/spec/catalog-table-model";
import type { Choice } from "@/lib/spec/rule-editor-data";
import { editKey, isMove, moveSubject, type MoveDraft, type RuleEditDraft } from "@/lib/spec/rule-edits";
import { loadParents, type ChildMoves, type ParentsData } from "@/app/(admin)/spec/rule-edit-actions";
import { ImpactBox, PendingTray, useRuleEditSession } from "@/components/spec/rule-edit-session";
import { ADMIN_SPEC_PARENTS_COPY as COPY, ADMIN_SPEC_RULE_EDIT_COPY as EDIT } from "@/lib/copy/spec";

/**
 * Moving a record from its own view (PROD-3007, ADR-026), inside the sections the record view already
 * has (Richard, 2026-10-15 — no separate Parents box): **Move** sits on the Catalog structure section,
 * whose parent rows then become dropdowns of every possible parent; the record's children table gets an
 * "Add to …" dropdown of every record that could move under it. The moves collect in the page's rule-edit
 * session — the same pending set, impact check and frame as the rule edits.
 *
 * On a record page Move is the page's own mode (exclusive with Edit rules); in the Spec Map's panel the
 * map's Move records mode is the way in, and the bar under the map submits.
 */
const LEVELS = new Set<TableKey>(["product", "inspiration", "productStyle", "customizationOption", "customizationType", "productLine", "customizationCategory", "solution", "solutionStyle"]);
/** The Catalog structure rows that are parents — the ones Move edits. */
export const PARENT_FIELDS = new Set(["productLine", "productStyle", "basedOn", "solutions", "solution", "type", "category"]);

type Move = {
  id: string;
  data: ParentsData;
  editing: boolean;
  /** The record page (its own buttons), not the Map's panel. */
  page: boolean;
  start: () => void;
  cancel: () => void;
};
const Ctx = createContext<Move | null>(null);
export const useRecordMove = () => useContext(Ctx);

export function RecordMoveProvider({ level, id, page, onEdit, children }: {
  level: TableKey;
  id: string;
  page: boolean;
  /** The Spec Map's way in (its Move records mode). */
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  const s = useRuleEditSession();
  const [data, setData] = useState<ParentsData | null>(null);
  const [, start] = useTransition();
  const version = s?.version ?? 0;
  useEffect(() => {
    if (!LEVELS.has(level)) return;
    start(async () => {
      const r = await loadParents(level, id);
      setData(r.ok && r.data.kind !== "none" ? r.data : null);
    });
  }, [level, id, version]);
  const names = useMemo(() => {
    if (!data) return {};
    const c = data.choices;
    return Object.fromEntries([...c.lines, ...c.styles, ...c.solutions, ...c.types, ...c.categories, ...c.bases, ...data.children.flatMap((g) => [...g.add, ...g.items])].map((x) => [x.id, x.title]));
  }, [data]);
  const addNames = s?.addNames;
  useEffect(() => { if (addNames && Object.keys(names).length) addNames(names); }, [names, addNames]);

  const value = useMemo<Move | null>(() => {
    if (!s || !data) return null;
    return {
      id, data, page: page && !onEdit,
      editing: data.canEdit && (onEdit ? s.editing : s.moving),
      start: onEdit ?? (() => s.setMoving(true)),
      cancel: () => {
        for (const e of s.edits) if (isMove(e)) s.remove(editKey(e));
        s.setMoving(false);
      },
    };
  }, [s, data, id, page, onEdit]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The Move button (like Edit rules), and a Pending badge while this record has a move waiting. */
export function MoveButton() {
  const m = useRecordMove();
  const s = useRuleEditSession();
  if (!m || !s || !m.data.canEdit) return null;
  const pending = s.edits.some((e) => isMove(e) && (moveSubject(e) === m.id || Object.values(e).includes(m.id)));
  return (
    <span className="flex items-center gap-2">
      {pending ? <Badge variant="outline" className="border-amber-500/60 text-amber-800 dark:text-amber-300">{COPY.pending}</Badge> : null}
      {m.editing ? null : (
        <Button size="sm" variant="outline" disabled={s.refreshing || (m.page && s.editing)} title={m.page && s.editing ? COPY.closeRulesFirst : undefined} onClick={m.start}>
          {s.refreshing ? EDIT.refreshing : COPY.move}
        </Button>
      )}
    </span>
  );
}

/** While moving: the record's parent rows as dropdowns, in the section's own row style. */
export function MoveFieldRows() {
  const m = useRecordMove();
  if (!m?.editing) return null;
  return (
    <>
      <div className="border-b border-border bg-primary/5 px-3 py-2 text-xs text-muted-foreground">{COPY.movingHint}</div>
      <Fields data={m.data} id={m.id} />
    </>
  );
}

/** Under the section while moving on a record page: pending, impact, note, and the three buttons. */
export function MoveFooter() {
  const m = useRecordMove();
  const s = useRuleEditSession();
  if (!m?.editing || !m.page || !s) return null;
  return (
    <div className="flex flex-col gap-4 rounded-md border border-primary/40 bg-card p-4">
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
        <Button size="sm" variant="ghost" disabled={s.submitting} onClick={m.cancel}>{EDIT.cancel}</Button>
      </div>
      <span className="text-xs text-muted-foreground">{EDIT.devOnly}</span>
    </div>
  );
}

/** The levels of records that can move under this one — each children table with one of them takes "Add to …". */
export const childAddLevels = (m: Move | null): { level: string; label: string }[] =>
  (m?.data.children ?? []).map((g) => ({ level: g.level, label: g.label }));
const groupOf = (m: Move, level: string) => m.data.children.find((g) => g.level === level);

/** In a children table's header while moving: the dropdown of records that could move under this one. */
export function ChildAdd({ label, level }: { label: string; level: string }) {
  const m = useRecordMove();
  const s = useRuleEditSession();
  const g = m ? groupOf(m, level) : undefined;
  if (!m?.editing || !g || !s) return null;
  const added = addedChildren(g, s.edits);
  return (
    <ParentSelect value={undefined} choices={g.add.filter((x) => !added.includes(x))} placeholder={COPY.addChild(label)}
      onChange={(x) => { const c = g.add.find((y) => y.id === x); if (c) s.put(c.move); }} />
  );
}

/** Rows for records added under this one and still pending (shown above the table's own rows). */
export function ChildPendingRows({ level }: { level: string }) {
  const m = useRecordMove();
  const s = useRuleEditSession();
  const g = m ? groupOf(m, level) : undefined;
  if (!m || !g || !s) return null;
  return (
    <>
      {addedChildren(g, s.edits).map((x) => (
        <tr key={x.id} className="border-t border-border bg-amber-500/5 first:border-t-0">
          <td className="px-3 py-2">
            <span className="font-medium text-foreground">{x.title}</span>{" "}
            <Badge variant="outline" className="border-amber-500/60 text-[10px] text-amber-800 dark:text-amber-300">{COPY.pendingChild}</Badge>
          </td>
          <td className="w-40 px-3 py-2 text-right">
            {m.editing ? <Button size="icon-xs" variant="ghost" aria-label={`${COPY.remove}: ${x.title}`} title={COPY.remove} onClick={() => s.remove(editKey(x.move))}><X /></Button> : null}
          </td>
        </tr>
      ))}
    </>
  );
}

function addedChildren(g: ChildMoves, edits: RuleEditDraft[]) {
  const byKey = new Map(edits.filter(isMove).map((e) => [editKey(e), JSON.stringify(e)]));
  return g.add.filter((x) => byKey.get(editKey(x.move)) === JSON.stringify(x.move));
}

// ── the parent rows ─────────────────────────────────────────────────────────────────────────

function Fields({ data, id }: { data: ParentsData; id: string }) {
  const s = useRuleEditSession()!;
  const c = data.choices;
  const moveOf = <K extends MoveDraft["kind"]>(kind: K) =>
    s.edits.find((e): e is Extract<MoveDraft, { kind: K }> => e.kind === kind && moveSubject(e as MoveDraft) === id);
  const cur = data.current;

  if (data.kind === "standard") {
    const p = moveOf("placement");
    const lineId = p?.lineId ?? cur.lineId;
    const styleIds = p?.styleIds ?? cur.styleIds ?? [];
    const place = (line: string | undefined, styles: string[]) => {
      if (!line) return;
      s.put({ kind: "placement", productId: id, lineId: line, styleIds: styles }, line === cur.lineId && same(styles, cur.styleIds ?? []));
    };
    const inLine = c.styles.filter((x) => x.lineId === lineId);
    return (
      <>
        <Row label={COPY.line}>
          <ParentSelect value={lineId} choices={c.lines} placeholder={COPY.pickLine2}
            onChange={(l) => place(l, styleIds.filter((x) => c.styles.find((y) => y.id === x)?.lineId === l))} />
        </Row>
        <Row label={COPY.styles}>
          <OrderedList ids={styleIds} onChange={(ids) => place(lineId, ids)} empty={COPY.noStyle}
            swap={(x) => inLine.filter((y) => y.id === x || !styleIds.includes(y.id))} placeholder={COPY.pickStyle} />
          <ParentSelect value={undefined} choices={inLine.filter((x) => !styleIds.includes(x.id))} placeholder={COPY.addStyle} onChange={(x) => place(lineId, [...styleIds, x])} />
        </Row>
        <SolutionsRow data={data} id={id} />
      </>
    );
  }
  if (data.kind === "inspiration") {
    const baseId = moveOf("basedOn")?.baseId ?? cur.baseId;
    return (
      <>
        <Row label={COPY.base}>
          <ParentSelect value={baseId} choices={c.bases} placeholder={COPY.pickBase2} onChange={(x) => s.put({ kind: "basedOn", productId: id, baseId: x }, x === cur.baseId)} />
        </Row>
        <SolutionsRow data={data} id={id} />
      </>
    );
  }
  if (data.kind === "style") {
    const lineId = moveOf("styleLine")?.lineId ?? cur.lineId;
    return (
      <Row label={COPY.line}>
        <ParentSelect value={lineId} choices={c.lines} placeholder={COPY.pickLine2} onChange={(x) => s.put({ kind: "styleLine", styleId: id, lineId: x }, x === cur.lineId)} />
      </Row>
    );
  }
  if (data.kind === "option") {
    const typeId = moveOf("optionType")?.typeId ?? cur.typeId;
    return (
      <Row label={COPY.type}>
        <ParentSelect value={typeId} choices={c.types} placeholder={COPY.pickType2} onChange={(x) => s.put({ kind: "optionType", optionId: id, typeId: x }, x === cur.typeId)} />
      </Row>
    );
  }
  if (data.kind === "type") {
    const categoryId = moveOf("typeCategory")?.categoryId ?? cur.categoryId;
    return (
      <Row label={COPY.category}>
        <ParentSelect value={categoryId} choices={c.categories} placeholder={COPY.pickCategory2} onChange={(x) => s.put({ kind: "typeCategory", typeId: id, categoryId: x }, x === cur.categoryId)} />
      </Row>
    );
  }
  if (data.kind === "solutionStyle") {
    const solutionId = moveOf("solutionStyleSolution")?.solutionId ?? cur.solutionId;
    return (
      <Row label={COPY.solution}>
        <ParentSelect value={solutionId} choices={c.solutions} placeholder={COPY.pickSolution} onChange={(x) => s.put({ kind: "solutionStyleSolution", styleId: id, solutionId: x }, x === cur.solutionId)} />
      </Row>
    );
  }
  return null; // a line, category or solution: no parent, only children
}

function SolutionsRow({ data, id }: { data: ParentsData; id: string }) {
  const s = useRuleEditSession()!;
  const c = data.choices;
  const m = s.edits.find((e) => e.kind === "solutions" && e.productId === id) as Extract<MoveDraft, { kind: "solutions" }> | undefined;
  const ids = m?.solutionIds ?? data.current.solutionIds ?? [];
  const set = (next: string[]) => s.put({ kind: "solutions", productId: id, solutionIds: next }, same(next, data.current.solutionIds ?? []));
  return (
    <Row label={COPY.solutions}>
      <OrderedList ids={ids} onChange={set} empty={COPY.none}
        swap={(x) => c.solutions.filter((y) => y.id === x || !ids.includes(y.id))} placeholder={COPY.pickSolution} />
      <ParentSelect value={undefined} choices={c.solutions.filter((x) => !ids.includes(x.id))} placeholder={COPY.addSolution} onChange={(x) => set([...ids, x])} />
    </Row>
  );
}

/** An ordered list of parents, the first the primary: a dropdown each, with make-primary and remove. */
function OrderedList({ ids, onChange, empty, swap, placeholder }: {
  ids: string[]; onChange: (ids: string[]) => void; empty: string; swap: (id: string) => Choice[]; placeholder: string;
}) {
  if (!ids.length) return <span className="text-muted-foreground">{empty}</span>;
  return (
    <ol className="flex flex-col gap-1">
      {ids.map((x, i) => (
        <li key={x} className="flex items-center gap-2">
          <ParentSelect value={x} choices={swap(x)} placeholder={placeholder} onChange={(y) => onChange(ids.map((z) => (z === x ? y : z)))} />
          {i === 0 && ids.length > 1 ? <Badge variant="secondary" className="shrink-0 text-[10px]">{COPY.primary}</Badge> : null}
          {i > 0 ? <Button size="icon-xs" variant="ghost" aria-label={COPY.makePrimary} title={COPY.makePrimary} onClick={() => onChange([x, ...ids.filter((y) => y !== x)])}><ArrowUp /></Button> : null}
          <Button size="icon-xs" variant="ghost" aria-label={COPY.remove} title={COPY.remove} onClick={() => onChange(ids.filter((y) => y !== x))}><X /></Button>
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
      <SelectTrigger size="sm" className="w-full max-w-sm bg-background" aria-label={placeholder}>
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

/** A row in the Catalog structure section's own style. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-border bg-primary/5 px-3 py-2 first:border-t-0 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="pt-1.5 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col gap-1.5">{children}</dd>
    </div>
  );
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
