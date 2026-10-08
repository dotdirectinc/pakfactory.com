"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, EyeOff, GripVertical, ImageOff, ListFilter, Search, X } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@pakfactory/ui/components/hover-card";
import { Pagination } from "@pakfactory/ui/components/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@pakfactory/ui/components/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@pakfactory/ui/components/dropdown-menu";
import type { CatalogRow, CatalogTable } from "@/lib/spec/catalog-tables";
import { useColumnDrag } from "./use-column-drag";
import { ADMIN_SPEC_TABLES_COPY as COPY } from "@/lib/copy/spec";

type Sort = { key: string; dir: 1 | -1 } | null;
type Saved = { visible: string[]; pageSize?: number };

const PAGE_SIZES = [25, 50, 100] as const;
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

const split = (v: string | number | null | undefined) => String(v ?? "").split(", ").filter(Boolean);

/** Move `key` to where `target` is (before it). */
function moveTo(list: string[], key: string, target: string) {
  if (key === target) return list;
  const next = list.filter((k) => k !== key);
  next.splice(next.indexOf(target), 0, key);
  return next;
}

/**
 * A read-only, Notion-like table of one record type (PROD-2926). Toolbar: search, Filter (status,
 * parent — shown as removable chips), Columns (show/hide and drag to reorder). Each header has a
 * menu (sort ascending/descending, hide) and can be dragged. Paged with the shared Pagination. The
 * column choice and page size are remembered per table in this browser.
 */
export function SpecCatalogTable({ table }: { table: CatalogTable }) {
  const all = useMemo(() => new Map(table.columns.map((c) => [c.key, c])), [table.columns]);
  const [visible, setVisible] = useState<string[]>(table.defaults);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[1]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<Sort>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [parent, setParent] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // Restore after mount (the server render has no storage), dropping columns that no longer exist.
  useEffect(() => {
    const s = load(table.key);
    if (s?.visible?.length) setVisible(s.visible.filter((k) => all.has(k)));
    if (s?.pageSize && PAGE_SIZES.includes(s.pageSize as (typeof PAGE_SIZES)[number])) setPageSize(s.pageSize);
  }, [table.key, all]);

  const persist = (next: Partial<Saved>) => save(table.key, { visible, pageSize, ...next });
  const updateVisible = (next: string[]) => {
    setVisible(next);
    persist({ visible: next });
  };
  const hidden = table.columns.filter((c) => !visible.includes(c.key));
  const reorder = (key: string, target: string) => updateVisible(moveTo(visible, key, target));
  // Headers: press and move drags, a click opens the header's menu. The Columns list: the grip drags.
  const header = useColumnDrag(`${table.key}:header`, reorder, (k) => setMenuFor(k));
  const list = useColumnDrag(`${table.key}:list`, reorder);

  const statuses = useMemo(
    () => [...new Set(table.rows.map((r) => r.cells.status).filter((s): s is string => typeof s === "string"))].sort(),
    [table.rows],
  );
  const parents = useMemo(
    () => (table.parent ? [...new Set(table.rows.flatMap((r) => split(r.cells[table.parent!])))].sort() : []),
    [table.rows, table.parent],
  );
  const parentLabel = table.parent ? (all.get(table.parent)?.label ?? COPY.parent) : COPY.parent;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = table.rows.filter(
      (r) =>
        (!status || r.cells.status === status) &&
        (!parent || (table.parent && split(r.cells[table.parent]).includes(parent))) &&
        (!needle || visible.some((k) => String(r.cells[k] ?? "").toLowerCase().includes(needle))),
    );
    if (sort) out = [...out].sort((a, b) => sort.dir * compare(a, b, sort.key));
    return out;
  }, [table.rows, table.parent, q, status, parent, sort, visible]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, totalPages);
  const shown = rows.slice((current - 1) * pageSize, current * pageSize);
  // A new filter or sort starts from the first page.
  useEffect(() => setPage(1), [q, status, parent, sort, pageSize]);

  const filters = [
    status ? { label: `${COPY.status}: ${status}`, clear: () => setStatus("") } : null,
    parent ? { label: `${parentLabel}: ${parent}`, clear: () => setParent("") } : null,
  ].filter((f): f is { label: string; clear: () => void } => Boolean(f));

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar — Notion-style: search on the left, view controls on the right. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={COPY.searchPlaceholder}
            aria-label={COPY.search}
            className="h-8 w-64 pl-8"
          />
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">{COPY.count(rows.length, table.rows.length)}</span>

        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ListFilter className="size-4" />
                {COPY.filter}
                {filters.length ? <Badge variant="secondary">{filters.length}</Badge> : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!statuses.length}>{COPY.status}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                  <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                    <DropdownMenuRadioItem value="">{COPY.any}</DropdownMenuRadioItem>
                    {statuses.map((s) => (
                      <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {table.parent ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={!parents.length}>{parentLabel}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                    <DropdownMenuRadioGroup value={parent} onValueChange={setParent}>
                      <DropdownMenuRadioItem value="">{COPY.any}</DropdownMenuRadioItem>
                      {parents.map((p) => (
                        <DropdownMenuRadioItem key={p} value={p}>{p}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              {filters.length ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => { setStatus(""); setParent(""); }}>{COPY.clearFilters}</DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Columns3 className="size-4" />
                {COPY.columns(visible.length, table.columns.length)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[28rem] w-72 overflow-y-auto">
              <DropdownMenuLabel className="flex items-center justify-between">
                {COPY.shown}
                <button type="button" className="text-xs font-normal text-muted-foreground hover:text-foreground" onClick={() => updateVisible([])}>
                  {COPY.hideAll}
                </button>
              </DropdownMenuLabel>
              {visible.map((k) => (
                <DropdownMenuCheckboxItem
                  key={k}
                  checked
                  data-col={k}
                  data-col-scope={`${table.key}:list`}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => updateVisible(visible.filter((x) => x !== k))}
                  className={`${list.dragging === k ? "opacity-40" : ""} ${list.over === k && list.dragging !== k ? "border-t-2 border-primary" : ""}`}
                >
                  <span className="flex-1 truncate">{all.get(k)?.label ?? k}</span>
                  <span {...list.handle(k)} className="-mr-1 cursor-grab touch-none p-0.5 active:cursor-grabbing" aria-label={COPY.dragHint} title={COPY.dragHint}>
                    <GripVertical className="size-4 text-muted-foreground" />
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center justify-between">
                {COPY.hidden}
                <button type="button" className="text-xs font-normal text-muted-foreground hover:text-foreground" onClick={() => updateVisible([...visible, ...hidden.map((c) => c.key)])}>
                  {COPY.showAll}
                </button>
              </DropdownMenuLabel>
              {hidden.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={false}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => updateVisible([...visible, c.key])}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => updateVisible(table.defaults)}>{COPY.reset}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filters.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <Badge key={f.label} variant="secondary" className="gap-1 pr-1">
              {f.label}
              <button type="button" onClick={f.clear} aria-label={COPY.removeFilter(f.label)} className="rounded-sm hover:bg-muted">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button variant="link" size="sm" className="h-auto px-0 text-muted-foreground" onClick={() => { setStatus(""); setParent(""); }}>
            {COPY.clearFilters}
          </Button>
        </div>
      ) : null}

      {/* The admin's table classes: packages/ui has no Table component. */}
      {/* Lighter than the page (card), with alternate rows tinted — Eric, 2026-10-08, for readability. */}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              {table.hasImages ? <th className="w-14 px-3 py-2 font-medium">{COPY.image}</th> : null}
              {visible.map((k) => (
                <th
                  key={k}
                  data-col={k}
                  data-col-scope={`${table.key}:header`}
                  title={COPY.headerHint}
                  className={`group whitespace-nowrap px-3 py-2 font-medium ${all.get(k)?.numeric ? "text-right" : ""} ${header.dragging === k ? "opacity-40" : ""} ${header.over === k && header.dragging !== k ? "shadow-[inset_2px_0_0_0_var(--color-primary)]" : ""}`}
                >
                  <DropdownMenu open={menuFor === k} onOpenChange={(o) => setMenuFor(o ? k : null)}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        {...header.handle(k)}
                        className="-mx-1 inline-flex cursor-grab touch-none items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground active:cursor-grabbing"
                      >
                        {all.get(k)?.label ?? k}
                        {sort?.key === k ? (
                          sort.dir === 1 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-0 group-hover:opacity-40" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onSelect={() => setSort({ key: k, dir: 1 })}>
                        <ArrowUp /> {COPY.sortAsc}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setSort({ key: k, dir: -1 })}>
                        <ArrowDown /> {COPY.sortDesc}
                      </DropdownMenuItem>
                      {sort?.key === k ? <DropdownMenuItem onSelect={() => setSort(null)}>{COPY.clearSort}</DropdownMenuItem> : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => updateVisible(visible.filter((x) => x !== k))}>
                        <EyeOff /> {COPY.hide}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={visible.length + (table.hasImages ? 1 : 0)} className="px-3 py-8 text-center text-muted-foreground">
                  {COPY.noMatch}
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.id} className="border-t border-border align-middle even:bg-muted/50 hover:bg-muted">
                  {table.hasImages ? (
                    <td className="px-3 py-2">
                      {r.image ? (
                        <HoverCard openDelay={150}>
                          <HoverCardTrigger asChild>
                            <img src={r.image.thumb} alt="" loading="lazy" className="size-10 rounded object-cover" />
                          </HoverCardTrigger>
                          <HoverCardContent side="right" className="w-72 p-1">
                            <img src={r.image.large} alt="" className="w-full rounded-sm" />
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded bg-muted" aria-label={COPY.noImage}>
                          <ImageOff className="size-4 text-muted-foreground" />
                        </span>
                      )}
                    </td>
                  ) : null}
                  {visible.map((k) => {
                    const v = r.cells[k];
                    const text = v === null || v === undefined ? "" : String(v);
                    const mono = k === "entityCode" || k === "entityId" || k === "sku";
                    const numeric = Boolean(all.get(k)?.numeric);
                    return (
                      <td
                        key={k}
                        className={`max-w-80 px-3 py-2 ${numeric ? "text-right tabular-nums" : ""} ${mono ? "whitespace-nowrap font-mono text-xs text-muted-foreground" : k === "title" ? "" : "text-muted-foreground"}`}
                      >
                        {k === "title" && r.href ? (
                          <Link href={r.href} className="font-medium text-foreground hover:underline">
                            {text || COPY.untitled}
                          </Link>
                        ) : text ? (
                          <span className={`line-clamp-2 break-words ${k === "title" ? "font-medium text-foreground" : ""}`} title={text.length > 80 ? text : undefined}>
                            {text}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        pageNumber={current}
        totalPages={totalPages}
        onPageChange={setPage}
        ariaLabel={COPY.paginationLabel}
        rightSlot={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{COPY.perPage}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                const n = Number(v);
                setPageSize(n);
                persist({ pageSize: n });
              }}
            >
              <SelectTrigger size="sm" className="w-20" aria-label={COPY.perPage}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  );
}
