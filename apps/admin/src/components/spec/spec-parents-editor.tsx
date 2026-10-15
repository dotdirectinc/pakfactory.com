"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowUp, X } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import type { TableKey } from "@/lib/spec/catalog-table-model";
import type { Choice } from "@/lib/spec/rule-editor-data";
import { isMove, moveSubject, type MoveDraft } from "@/lib/spec/rule-edits";
import { loadParents, type ParentsData } from "@/app/(admin)/spec/rule-edit-actions";
import { RuleEditFooter, useRuleEditSession } from "@/components/spec/rule-edit-session";
import { Picker } from "@/components/spec/spec-rule-editor";
import { ADMIN_SPEC_PARENTS_COPY as COPY } from "@/lib/copy/spec";

/**
 * A record's parents — its line and styles, its base and solutions, its type or category — and moving it
 * (PROD-3007, ADR-026). A change is a move in the page's rule-edit session: the same pending set, impact
 * check and frame as the rule edits. Shown with the session's pending move applied.
 */
const PARENT_LEVELS = new Set<TableKey>(["product", "inspiration", "productStyle", "customizationOption", "customizationType"]);
const RULE_LEVELS = new Set<TableKey>(["product", "customizationOption", "customizationType"]);

export function SpecParentsEditor({ level, id, footer, onEdit }: {
  level: TableKey;
  id: string;
  /** Show the pending set and Submit under the section (the Catalog page, when no rules section shows them). */
  footer: boolean;
  /** The host's way into editing (the Spec Map's structure mode); otherwise the session's own. */
  onEdit?: () => void;
}) {
  const s = useRuleEditSession();
  const [data, setData] = useState<ParentsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const version = s?.version ?? 0;
  useEffect(() => {
    if (!PARENT_LEVELS.has(level)) return;
    start(async () => {
      const r = await loadParents(level, id);
      if (r.ok) { setData(r.data); setError(null); } else setError(r.error);
    });
  }, [level, id, version]);

  const names = useMemo(() => {
    if (!data) return {};
    const c = data.choices;
    return Object.fromEntries([...c.lines, ...c.styles, ...c.solutions, ...c.types, ...c.categories, ...c.bases].map((x) => [x.id, x.title]));
  }, [data]);
  const addNames = s?.addNames;
  useEffect(() => { if (addNames && Object.keys(names).length) addNames(names); }, [names, addNames]);

  if (!PARENT_LEVELS.has(level) || !s) return null;
  if (error) return <p className="text-sm text-destructive">{COPY.unreachable} ({error})</p>;
  if (!data) return <p className="text-sm text-muted-foreground">{COPY.loading}</p>;
  if (data.kind === "none") return null;

  const pending = s.edits.find((e): e is MoveDraft => isMove(e) && moveSubject(e) === id && kindFits(e, data.kind));
  const editing = data.canEdit && s.editing;
  const startEditing = onEdit ?? (() => s.setEditing(true));

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          {COPY.title}
          {pending ? <Badge variant="outline" className="border-amber-500/60 text-amber-800 dark:text-amber-300">{COPY.pending}</Badge> : null}
        </h3>
        {data.canEdit && !s.editing ? (
          <Button size="sm" variant="outline" disabled={s.refreshing} onClick={startEditing}>{COPY.change}</Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{editing ? COPY.hint : COPY.readOnly}</p>
      <Fields data={data} id={id} editing={editing} />
      {/* The rules section shows the pending set where there is one; an inspiration product has none. */}
      {editing && footer && (!RULE_LEVELS.has(level) || data.kind === "inspiration") ? <RuleEditFooter /> : null}
    </section>
  );
}

function kindFits(e: MoveDraft, kind: ParentsData["kind"]) {
  switch (kind) {
    case "standard": return e.kind === "placement" || e.kind === "solutions";
    case "inspiration": return e.kind === "basedOn" || e.kind === "solutions";
    case "style": return e.kind === "styleLine";
    case "option": return e.kind === "optionType";
    case "type": return e.kind === "typeCategory";
    default: return false;
  }
}

/** The record's parents with the session's moves applied; editable when `editing`. */
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
    return (
      <dl className="grid gap-3 text-sm">
        <Row label={COPY.line}>
          <span className="font-medium">{title(c.lines, lineId)}</span>
          {editing ? (
            <Picker choices={c.lines.filter((l) => l.id !== lineId)} placeholder={COPY.pickLine}
              onPick={(l) => place(l.id, styleIds.filter((x) => c.styles.find((y) => y.id === x)?.lineId === l.id))} />
          ) : null}
        </Row>
        <Row label={COPY.styles}>
          <OrderedList ids={styleIds} names={(x) => title(c.styles, x)} editing={editing}
            onChange={(ids) => place(lineId, ids)} empty={COPY.noStyle} />
          {editing ? <Picker choices={c.styles.filter((x) => x.lineId === lineId && !styleIds.includes(x.id))} placeholder={COPY.addStyle} onPick={(x) => place(lineId, [...styleIds, x.id])} /> : null}
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
          <span className="font-medium">{title(c.bases, baseId)}</span>
          {editing ? (
            <Picker choices={c.bases.filter((x) => x.id !== baseId)} placeholder={COPY.pickBase}
              onPick={(x) => s.put({ kind: "basedOn", productId: id, baseId: x.id }, x.id === cur.baseId)} />
          ) : null}
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
          <span className="font-medium">{title(c.lines, lineId)}</span>
          {editing ? <Picker choices={c.lines.filter((x) => x.id !== lineId)} placeholder={COPY.pickLine} onPick={(x) => s.put({ kind: "styleLine", styleId: id, lineId: x.id }, x.id === cur.lineId)} /> : null}
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
          <span className="font-medium">{title(c.types, typeId)}</span>
          {editing ? <Picker choices={c.types.filter((x) => x.id !== typeId)} placeholder={COPY.pickType} onPick={(x) => s.put({ kind: "optionType", optionId: id, typeId: x.id }, x.id === cur.typeId)} /> : null}
        </Row>
      </dl>
    );
  }
  const m = moveOf("typeCategory");
  const categoryId = m?.categoryId ?? cur.categoryId;
  return (
    <dl className="grid gap-3 text-sm">
      <Row label={COPY.category}>
        <span className="font-medium">{title(c.categories, categoryId)}</span>
        {editing ? <Picker choices={c.categories.filter((x) => x.id !== categoryId)} placeholder={COPY.pickCategory} onPick={(x) => s.put({ kind: "typeCategory", typeId: id, categoryId: x.id }, x.id === cur.categoryId)} /> : null}
      </Row>
    </dl>
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
      <OrderedList ids={ids} names={(x) => c.solutions.find((y) => y.id === x)?.title ?? x} editing={editing} onChange={set} empty={COPY.none} />
      {editing ? <Picker choices={c.solutions.filter((x) => !ids.includes(x.id))} placeholder={COPY.addSolution} onPick={(x) => set([...ids, x.id])} /> : null}
    </Row>
  );
}

/** An ordered list of parents: the first is the primary; while editing, promote or remove. */
function OrderedList({ ids, names, editing, onChange, empty }: { ids: string[]; names: (id: string) => string; editing: boolean; onChange: (ids: string[]) => void; empty: string }) {
  if (!ids.length) return <span className="text-muted-foreground">{empty}</span>;
  return (
    <ol className="flex flex-col gap-1">
      {ids.map((x, i) => (
        <li key={x} className="flex items-center gap-2">
          <span className={i === 0 ? "font-medium" : ""}>{names(x)}</span>
          {i === 0 && ids.length > 1 ? <Badge variant="secondary" className="text-[10px]">{COPY.primary}</Badge> : null}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-start">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="flex flex-col gap-1.5">{children}</dd>
    </div>
  );
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
