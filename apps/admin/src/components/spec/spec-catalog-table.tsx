"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import type { CatalogRow, CatalogTable } from "@/lib/spec/catalog-tables";
import { ADMIN_SPEC_TABLES_COPY as COPY } from "@/lib/copy/spec";

type Sort = { key: string; dir: 1 | -1 } | null;
type Saved = { visible: string[] };

const PAGE = 200;
const storageKey = (table: string) => `spec-table:${table}`;

function load(table: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(storageKey(table));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(table: string, s: Saved) {
  try {
    window.localStorage.setItem(storageKey(table), JSON.stringify(s));
  } catch {
    /* private window or blocked storage: the choice just isn't remembered */
  }
}

function compare(a: CatalogRow, b: CatalogRow, key: string) {
  const x = a.cells[key];
  const y = b.cells[key];
  if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
  if (y === null || y === undefined) return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y), undefined, { numeric: true });
}

/**
 * A read-only, Notion-like table of one record type (PROD-2926): pick columns, drag their headers
 * to reorder, sort by clicking a header, filter by status / parent / text. The column choice is
 * remembered per table in this browser.
 */
export function SpecCatalogTable({ table }: { table: CatalogTable }) {
  const all = useMemo(() => new Map(table.columns.map((c) => [c.key, c])), [table.columns]);
  const [visible, setVisible] = useState<string[]>(table.defaults);
  const [sort, setSort] = useState<Sort>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [parent, setParent] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [dragging, setDragging] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Restore after mount (the server render has no storage), dropping columns that no longer exist.
  useEffect(() => {
    const s = load(table.key);
    if (s?.visible?.length) setVisible(s.visible.filter((k) => all.has(k)));
  }, [table.key, all]);

  const update = (next: string[]) => {
    setVisible(next);
    save(table.key, { visible: next });
  };

  const statuses = useMemo(
    () => [...new Set(table.rows.map((r) => r.cells.status).filter((s): s is string => typeof s === "string"))].sort(),
    [table.rows],
  );
  const parents = useMemo(
    () => (table.parent ? [...new Set(table.rows.flatMap((r) => String(r.cells[table.parent!] ?? "").split(", ")).filter(Boolean))].sort() : []),
    [table.rows, table.parent],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = table.rows.filter(
      (r) =>
        (!status || r.cells.status === status) &&
        (!parent || (table.parent && String(r.cells[table.parent] ?? "").split(", ").includes(parent))) &&
        (!needle || visible.some((k) => String(r.cells[k] ?? "").toLowerCase().includes(needle))),
    );
    if (sort) out = [...out].sort((a, b) => sort.dir * compare(a, b, sort.key));
    return out;
  }, [table.rows, table.parent, q, status, parent, sort, visible]);

  const toggle = (key: string) => update(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key]);
  const onSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));
  const drop = (target: string) => {
    if (!dragging || dragging === target) return;
    const next = visible.filter((k) => k !== dragging);
    next.splice(next.indexOf(target), 0, dragging);
    update(next);
    setDragging(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">{COPY.search}</span>
          <input
            className="h-9 w-56 rounded-md border border-input bg-background px-2 text-foreground"
            value={q}
            placeholder={COPY.searchPlaceholder}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
          />
        </label>
        {statuses.length ? (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">{COPY.status}</span>
            <select className="h-9 rounded-md border border-input bg-background px-2 text-foreground" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{COPY.any}</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        ) : null}
        {table.parent && parents.length ? (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">{all.get(table.parent)?.label ?? COPY.parent}</span>
            <select className="h-9 max-w-64 rounded-md border border-input bg-background px-2 text-foreground" value={parent} onChange={(e) => setParent(e.target.value)}>
              <option value="">{COPY.any}</option>
              {parents.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        ) : null}
        <div className="relative">
          <Button size="sm" variant="outline" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
            {COPY.columns(visible.length, table.columns.length)}
          </Button>
          {menuOpen ? (
            <div className="absolute left-0 z-20 mt-1 max-h-96 w-72 overflow-y-auto rounded-md border border-border bg-background p-2 shadow-md">
              <div className="mb-1 flex justify-between gap-2 px-1 text-xs">
                <button type="button" className="text-muted-foreground hover:underline" onClick={() => update(table.defaults)}>{COPY.reset}</button>
                <button type="button" className="text-muted-foreground hover:underline" onClick={() => setMenuOpen(false)}>{COPY.close}</button>
              </div>
              {table.columns.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50">
                  <input type="checkbox" checked={visible.includes(c.key)} onChange={() => toggle(c.key)} />
                  <span className="text-foreground">{c.label}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
        <span className="pb-2 text-muted-foreground">{COPY.count(rows.length, table.rows.length)}</span>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {table.hasImages ? <th className="w-14 px-2 py-2 font-medium">{COPY.image}</th> : null}
              {visible.map((k) => (
                <th
                  key={k}
                  draggable
                  onDragStart={() => setDragging(k)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => drop(k)}
                  onDragEnd={() => setDragging(null)}
                  className={`cursor-grab select-none whitespace-nowrap px-2 py-2 font-medium ${dragging === k ? "opacity-40" : ""}`}
                  title={COPY.headerHint}
                >
                  <button type="button" className="hover:text-foreground" onClick={() => onSort(k)}>
                    {all.get(k)?.label ?? k}
                    {sort?.key === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((r) => (
              <tr key={r.id} className="border-t border-border align-top hover:bg-muted/30">
                {table.hasImages ? (
                  <td className="px-2 py-1.5">
                    {r.image ? (
                      <span className="group relative block h-10 w-10">
                        <img src={r.image.thumb} alt="" loading="lazy" className="h-10 w-10 rounded object-cover" />
                        <img
                          src={r.image.large}
                          alt=""
                          loading="lazy"
                          className="pointer-events-none absolute left-12 top-0 z-10 hidden w-60 rounded-md border border-border bg-background shadow-lg group-hover:block"
                        />
                      </span>
                    ) : (
                      <span className="block h-10 w-10 rounded bg-muted" aria-label={COPY.noImage} />
                    )}
                  </td>
                ) : null}
                {visible.map((k, i) => {
                  const v = r.cells[k];
                  const text = v === null || v === undefined ? "" : String(v);
                  return (
                    <td key={k} className="max-w-80 px-2 py-1.5 text-foreground">
                      {i === 0 && r.href ? (
                        <Link href={r.href} className="font-medium hover:underline">{text || COPY.untitled}</Link>
                      ) : (
                        <span className="line-clamp-2 break-words" title={text.length > 80 ? text : undefined}>{text}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown ? (
        <div>
          <Button size="sm" variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            {COPY.more(Math.min(PAGE, rows.length - shown), rows.length - shown)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
