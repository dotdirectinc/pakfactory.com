"use client";

import Link from "next/link";
import { ArrowUpRight, Network } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { mapHref } from "@/lib/spec/map-href";
import { Badge } from "@pakfactory/ui/components/badge";
import type { CatalogRecord } from "@/lib/spec/catalog-record";
import type { RecordGroup, RecordItem } from "@/lib/spec/record-sections";
import { isTableKey, type TableKey } from "@/lib/spec/catalog-table-model";
import { SpecRegistryId } from "@/components/spec/spec-registry-id";
import { SpecRuleEditor } from "@/components/spec/spec-rule-editor";
import { ChildAdd, ChildPendingRows, MoveButton, MoveFieldRows, MoveFooter, PARENT_FIELDS, RecordMoveProvider, childAddLevels, useRecordMove } from "@/components/spec/spec-parents-editor";
import type { ChildGroup } from "@/lib/spec/catalog-record";
import type { RecordSection } from "@/lib/spec/record-sections";
import { WithRuleEditSession } from "@/components/spec/rule-edit-session";
import { ADMIN_SPEC_RECORD_COPY as COPY } from "@/lib/copy/spec";

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

/** `/spec/catalog/<level>/<id>` → its level and id; anything else is not a record link. */
function recordTarget(href: string): { key: TableKey; id: string } | null {
  const m = /^\/spec\/catalog\/([^/?#]+)\/([^/?#]+)$/.exec(href);
  return m && isTableKey(m[1]) ? { key: m[1], id: decodeURIComponent(m[2]!) } : null;
}

type OnSelect = (key: TableKey, id: string) => void;

/** Records with a Parents section (PROD-3007) besides the three with rules. */
const MOVABLE = new Set<TableKey>(["inspiration", "productStyle", "productLine", "customizationCategory", "solution", "solutionStyle"]);

/** A link to another record: a selection when the host handles one (the map), else navigation. */
function RecordLink({ href, className, onSelect, children }: { href: string; className: string; onSelect?: OnSelect; children: React.ReactNode }) {
  const target = onSelect ? recordTarget(href) : null;
  return target ? (
    <button type="button" className={`text-left ${className}`} onClick={() => onSelect!(target.key, target.id)}>
      {children}
    </button>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * One catalog record — its images, registry identity, the records below it and every field (the
 * records above it are links in its fields). The Catalog renders it as a page; the Spec Map in its
 * side panel (PROD-2960), where `onSelect` turns links to other records into selections on the map
 * instead of navigation.
 */
export function SpecRecordView({
  record: r,
  heading = "h1",
  onSelect,
  rulesEditor = true,
  onEditParents,
}: {
  record: CatalogRecord;
  heading?: "h1" | "h2";
  onSelect?: OnSelect;
  /**
   * The Customization rules section. Off in the Spec Map's panel (Richard, 2026-10-14): there the
   * diagram and the bar under it are the editor, and two editors side by side read as redundant. The
   * record's full page keeps it — the other way in.
   */
  rulesEditor?: boolean;
  /** The Spec Map's way into moving records (its structure mode); the page's own session otherwise. */
  onEditParents?: () => void;
}) {
  const Title = heading;
  const Section = heading === "h1" ? "h2" : "h3";


  // One pending set for the whole record (PROD-3007): its rule edits and its moves share a tray and a frame.
  return (
    <WithRuleEditSession>
    <RecordMoveProvider level={r.key} id={r.id} page={rulesEditor} onEdit={onEditParents}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {r.images[0] ? (
          <img src={`${r.images[0]}?w=240&h=240&fit=crop&auto=format`} alt="" className="size-28 shrink-0 rounded-md border border-border object-cover" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Title className="text-xl font-semibold tracking-tight text-foreground">{r.title}</Title>
            {r.status ? <Badge variant={r.status === "active" ? "secondary" : "outline"}>{r.status}</Badge> : null}
          </div>
          <SpecRegistryId registry={r.registry} />
          {/* The way to the Map (2026-10-15): the Catalog reads and compares, the Map edits and relates. Not on the Map itself. */}
          {onSelect ? null : (
            <Button asChild size="sm" className="w-fit" title={COPY.showOnMapTitle}>
              <Link href={mapHref(r.key, r.id)}><Network /> {COPY.showOnMap}</Link>
            </Button>
          )}
          {r.rulesHref ? (
            <Link href={r.rulesHref} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-foreground hover:underline">
              {COPY.rules} <ArrowUpRight className="size-4" />
            </Link>
          ) : null}
          <p className="text-xs text-muted-foreground">{r.key === "product" || r.key === "customizationOption" || r.key === "customizationType" ? (rulesEditor ? COPY.rulesEditable(r.dataset) : COPY.rulesOnMap(r.dataset)) : MOVABLE.has(r.key) ? COPY.movable(r.dataset) : COPY.readOnly(r.dataset)}</p>
        </div>
      </header>

      {rulesEditor ? <SpecRuleEditor level={r.key} id={r.id} title={r.title} /> : null}

      {r.images.length > 1 ? (
        <section className="flex flex-col gap-2">
          <Section className="text-base font-semibold text-foreground">{COPY.images(r.images.length)}</Section>
          <div className="flex flex-wrap gap-2">
            {r.images.map((src, i) => (
              <a key={`${src}-${i}`} href={src} target="_blank" rel="noreferrer">
                <img src={`${src}?w=160&h=160&fit=crop&auto=format`} alt="" loading="lazy" className="size-24 rounded-md border border-border object-cover" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <ChildTables groups={r.children} Section={Section} onSelect={onSelect} hasStructure={r.sections.some((x) => x.key === "structure")} />

      <p className="text-xs text-muted-foreground">{COPY.legend}</p>
      {r.sections.map((sec) => <RecordSectionView key={sec.key} sec={sec} Section={Section} onSelect={onSelect} />)}
    </RecordMoveProvider>
    </WithRuleEditSession>
  );
}

/** A field's references: under group headings when there are groups, else one wrapped line. */
function FieldGroups({ groups, onSelect }: { groups: RecordGroup[]; onSelect?: OnSelect }) {
  if (groups.length === 1 && groups[0]!.title === null) return <Items items={groups[0]!.items} onSelect={onSelect} />;
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g, gi) => (
        <div key={`${g.title}-${gi}`} className="flex flex-col gap-1">
          {g.title !== null ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {g.title} <span className="tabular-nums">· {g.items.length}</span>
            </span>
          ) : null}
          <Items items={g.items} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

/** Links, then names with no Spec page, then unpublished references — labelled apart when mixed. */
function Items({ items, onSelect }: { items: RecordItem[]; onSelect?: OnSelect }) {
  if (!items.length) return <span className="text-muted-foreground/60">{COPY.empty}</span>;
  const kind = (i: RecordItem) => (i.href ? 0 : i.published ? 1 : 2);
  const mixed = new Set(items.map(kind)).size > 1;
  return (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {items.map((it, i) => {
        const k = kind(it);
        const label = mixed && k > 0 && (i === 0 || kind(items[i - 1]!) !== k) ? (k === 1 ? COPY.noPageLabel : COPY.unpublishedLabel) : null;
        return (
          <span key={`${it.title}-${i}`} className="inline-flex flex-wrap items-baseline gap-1">
            {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
            {it.href ? (
              <RecordLink href={it.href} onSelect={onSelect} className="underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground">
                {it.title}
              </RecordLink>
            ) : it.published ? (
              <span className="text-muted-foreground" title={COPY.noPage}>{it.title}</span>
            ) : (
              <span className="italic text-muted-foreground/70" title={COPY.unpublished}>{it.title}</span>
            )}
            {it.tags.map((t) => (
              <Badge key={t} variant="outline" className="px-1.5 py-0 text-[10px] font-normal">{t}</Badge>
            ))}
            {it.note ? <span className="text-xs text-muted-foreground">— {it.note}</span> : null}
          </span>
        );
      })}
    </span>
  );
}

type SectionTag = "h2" | "h3";

/**
 * One section of fields. Catalog structure carries Move (PROD-3007): while moving, its parent rows are
 * dropdowns (MoveFieldRows) and the rest stay as they are; the pending moves and buttons follow it.
 */
function RecordSectionView({ sec, Section, onSelect }: { sec: RecordSection; Section: SectionTag; onSelect?: OnSelect }) {
  const m = useRecordMove();
  const structure = sec.key === "structure";
  const moving = structure && Boolean(m?.editing);
  const fields = moving ? sec.fields.filter((f) => !PARENT_FIELDS.has(f.key)) : sec.fields;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Section className="text-base font-semibold text-foreground">{sec.title}</Section>
        {structure ? <MoveButton /> : null}
      </div>
      <dl className={`overflow-hidden rounded-md border bg-card text-sm ${moving ? "border-primary/50 ring-1 ring-primary/30" : "border-border"}`}>
        {structure ? <MoveFieldRows /> : null}
        {fields.map((f) => (
          <div key={f.key} className="grid gap-1 border-t border-border px-3 py-2 first:border-t-0 even:bg-muted/50 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="min-w-0 break-words text-foreground">
              {f.groups.length ? (
                <FieldGroups groups={f.groups} onSelect={onSelect} />
              ) : f.text === null ? (
                <span className="text-muted-foreground/60">{COPY.empty}</span>
              ) : f.key === "_createdAt" || f.key === "_updatedAt" ? (
                when(String(f.text))
              ) : (
                String(f.text)
              )}
            </dd>
          </div>
        ))}
      </dl>
      {structure ? <MoveFooter /> : null}
    </section>
  );
}

/**
 * The records below this one, a table per kind. The table of the kind that can move under this record
 * takes "Add to …" while moving (and shows the records added, pending); with no Catalog structure section
 * (a line, a category, a solution) it also carries Move and the buttons. While moving, a record with no
 * such children yet shows the empty table, so there is somewhere to add them.
 */
function ChildTables({ groups, Section, onSelect, hasStructure }: { groups: ChildGroup[]; Section: SectionTag; onSelect?: OnSelect; hasStructure: boolean }) {
  const m = useRecordMove();
  const adds = childAddLevels(m);
  const addLevels = new Set(adds.map((a) => a.level));
  const showEmpty = Boolean(m?.editing || (!hasStructure && m?.data.canEdit));
  const shown: ChildGroup[] = [
    ...groups,
    ...(showEmpty ? adds.filter((a) => !groups.some((g) => g.table === a.level)).map((a) => ({ label: a.label, table: a.level as ChildGroup["table"], rows: [], total: 0 })) : []),
  ];
  // With no Catalog structure section, Move sits on the first table that takes "Add to …".
  const moveOn = shown.find((c) => addLevels.has(c.table))?.table;
  return (
    <>
      {shown.map((c) => {
        const takesAdd = addLevels.has(c.table);
        return (
          <section key={c.label} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Section className="text-base font-semibold text-foreground">
                {c.label} <span className="font-normal text-muted-foreground">({c.total})</span>
              </Section>
              {c.table === moveOn && !hasStructure ? <MoveButton /> : null}
            </div>
            {takesAdd ? <ChildAdd label={c.label} level={c.table} /> : null}
            <div className={`overflow-hidden rounded-md border bg-card ${takesAdd && m?.editing ? "border-primary/50" : "border-border"}`}>
              <table className="w-full text-sm">
                <tbody>
                  {takesAdd ? <ChildPendingRows level={c.table} /> : null}
                  {c.rows.map((row) => (
                    <tr key={row.id} className="border-t border-border first:border-t-0 even:bg-muted/50 hover:bg-muted">
                      <td className="px-3 py-2">
                        <RecordLink href={row.href} onSelect={onSelect} className="font-medium text-foreground hover:underline">{row.title}</RecordLink>
                      </td>
                      <td className="w-40 px-3 py-2 text-muted-foreground">{row.status ?? "—"}</td>
                    </tr>
                  ))}
                  {!c.rows.length ? <tr><td className="px-3 py-2 text-muted-foreground" colSpan={2}>—</td></tr> : null}
                </tbody>
              </table>
            </div>
            {c.total > c.rows.length ? <p className="text-xs text-muted-foreground">{COPY.more(c.rows.length, c.total)}</p> : null}
            {c.table === moveOn && !hasStructure ? <MoveFooter /> : null}
          </section>
        );
      })}
    </>
  );
}
