"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight, Maximize2, Minus, Plus, Search } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@pakfactory/ui/components/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@pakfactory/ui/components/sheet";
import { TABLE_GROUPS, recordHref, type TableKey } from "@/lib/spec/catalog-table-model";
import type { CatalogRecord } from "@/lib/spec/catalog-record";
import type { SpecMapData } from "@/lib/spec/spec-map";
import { SpecRecordView } from "@/components/spec/spec-record-view";
import { loadMapCompatible, loadMapRecord } from "@/app/(admin)/spec/map/actions";
import { ADMIN_SPEC_MAP_COPY as COPY } from "@/lib/copy/spec";

/**
 * The Spec Map (PROD-2960): the Catalog's three streams side by side, one column per level, a
 * colour per level, cards joined by arrows parent → child. Read-only: selecting a card highlights
 * its chain up and down plus what it is compatible with, and opens the shared record view.
 *
 * Laid out here from fixed card sizes — no measuring, no layout library: each column is ordered by
 * its parents' positions, so arrows mostly run straight across.
 */

const CARD_W = 232;
const CARD_H = 48;
const ROW_H = 56;
const COL_W = 312;
const STREAM_GAP = 120;
const HEAD_H = 56;
const LEVEL_COLOURS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
/** Many-to-many and large: shown on demand. */
const COLLAPSED_AT_START: TableKey[] = ["productValue", "optionValue"];
const ALL = "all";

type Pos = { x: number; y: number };
type Column = { level: TableKey; label: string; x: number; y: number; total: number; shown: number; collapsed: boolean; colour: string };
type View = { x: number; y: number; k: number };

const LEVEL_INFO = new Map(
  TABLE_GROUPS.flatMap((g) => g.levels.map((l, i) => [l.key, { stream: g.key, label: l.label, index: i }] as const)),
);

export function SpecMap({ data }: { data: SpecMapData }) {
  const { nodes, edges, links } = data;
  const [streams, setStreams] = useState<Set<string>>(() => new Set(TABLE_GROUPS.map((g) => g.key)));
  const [collapsed, setCollapsed] = useState<Set<TableKey>>(() => new Set(COLLAPSED_AT_START));
  const [status, setStatus] = useState<string>(ALL);
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<View>({ x: 24, y: 24, k: 0.8 });
  const [centreOn, setCentreOn] = useState<number | null>(null);
  const viewport = useRef<HTMLDivElement>(null);

  const parentsOf = useMemo(() => adjacency(nodes.length, edges, 1, 0), [nodes.length, edges]);
  const childrenOf = useMemo(() => adjacency(nodes.length, edges, 0, 1), [nodes.length, edges]);
  const linksOf = useMemo(() => {
    const m = new Map<number, number[]>();
    for (const [a, b] of links) {
      m.set(a, [...(m.get(a) ?? []), b]);
      m.set(b, [...(m.get(b) ?? []), a]);
    }
    return m;
  }, [links]);
  const statuses = useMemo(() => [...new Set(nodes.map((n) => n.status).filter((s): s is string => Boolean(s)))].sort(), [nodes]);

  // ── layout ──────────────────────────────────────────────────────────────────
  const layout = useMemo(() => {
    const pos: (Pos | null)[] = nodes.map(() => null);
    const columns: Column[] = [];
    const byLevel = new Map<TableKey, number[]>();
    nodes.forEach((n, i) => byLevel.set(n.level, [...(byLevel.get(n.level) ?? []), i]));
    let x0 = 0;
    let height = 0;
    for (const g of TABLE_GROUPS) {
      if (!streams.has(g.key)) continue;
      g.levels.forEach((l, li) => {
        const all = byLevel.get(l.key) ?? [];
        const isCollapsed = collapsed.has(l.key);
        const shown = isCollapsed ? [] : all.filter((i) => status === ALL || !nodes[i]!.status || nodes[i]!.status === status);
        // Order by where the parents sit (their mean row), so arrows run across; no parent → last.
        const rank = (i: number) => {
          const ys = (parentsOf[i] ?? []).map((p) => pos[p]?.y).filter((y): y is number => y !== undefined);
          return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : Number.POSITIVE_INFINITY;
        };
        const ordered = li === 0 ? shown : [...shown].map((i, o) => ({ i, r: rank(i), o })).sort((a, b) => a.r - b.r || a.o - b.o).map((x) => x.i);
        const x = x0 + li * COL_W;
        ordered.forEach((i, row) => (pos[i] = { x, y: HEAD_H + row * ROW_H }));
        columns.push({ level: l.key, label: l.label, x, y: 0, total: all.length, shown: ordered.length, collapsed: isCollapsed, colour: LEVEL_COLOURS[li % LEVEL_COLOURS.length]! });
        height = Math.max(height, HEAD_H + Math.max(ordered.length, 1) * ROW_H);
      });
      x0 += g.levels.length * COL_W + STREAM_GAP;
    }
    return { pos, columns, width: Math.max(x0 - STREAM_GAP, COL_W), height };
  }, [nodes, streams, collapsed, status, parentsOf]);

  // ── selection: the chain up and down, cross-stream links, and the rules' compatibility ──
  const [compatible, setCompatible] = useState<Set<number>>(new Set());
  const [record, setRecord] = useState<{ for: number; res: Awaited<ReturnType<typeof loadMapRecord>> } | null>(null);
  const [, startLoading] = useTransition();

  const chain = useMemo(() => {
    if (selected === null) return null;
    const out = new Set<number>([selected]);
    const walk = (from: number, next: number[][]) => {
      const stack = [from];
      while (stack.length) {
        for (const n of next[stack.pop()!] ?? []) {
          if (out.has(n)) continue;
          out.add(n);
          stack.push(n);
        }
      }
    };
    walk(selected, parentsOf);
    walk(selected, childrenOf);
    for (const l of linksOf.get(selected) ?? []) out.add(l);
    return out;
  }, [selected, parentsOf, childrenOf, linksOf]);

  useEffect(() => {
    if (selected === null) return;
    const n = nodes[selected]!;
    setCompatible(new Set());
    startLoading(async () => {
      const [rec, compat] = await Promise.all([loadMapRecord(n.level, n.id), loadMapCompatible(n.level, n.id)]);
      setRecord({ for: selected, res: rec });
      if (compat.ok) {
        const want = new Set([...compat.data.products.map((id) => `product:${id}`), ...compat.data.options.map((id) => `customizationOption:${id}`)]);
        setCompatible(new Set(nodes.flatMap((m, i) => (want.has(`${m.level}:${m.id}`) ? [i] : []))));
      }
    });
  }, [selected, nodes]);

  /** Select a record, making sure it is on the map (its stream shown, its level open, its status kept). */
  const select = useCallback(
    (i: number) => {
      const n = nodes[i]!;
      const stream = LEVEL_INFO.get(n.level)?.stream;
      if (stream && !streams.has(stream)) setStreams((s) => new Set(s).add(stream));
      if (collapsed.has(n.level)) setCollapsed((c) => { const x = new Set(c); x.delete(n.level); return x; });
      if (status !== ALL && n.status && n.status !== status) setStatus(ALL);
      setSelected(i);
      setCentreOn(i);
    },
    [nodes, streams, collapsed, status],
  );
  const selectBy = useCallback(
    (level: TableKey, id: string) => {
      const i = nodes.findIndex((n) => n.level === level && n.id === id);
      if (i >= 0) select(i);
    },
    [nodes, select],
  );

  // ── pan and zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (centreOn === null) return;
    const p = layout.pos[centreOn];
    const el = viewport.current;
    if (!p || !el) return;
    setView((v) => {
      const k = Math.max(v.k, 0.6);
      return { k, x: el.clientWidth / 2 - (p.x + CARD_W / 2) * k, y: el.clientHeight / 2 - (p.y + CARD_H / 2) * k };
    });
    setCentreOn(null);
  }, [centreOn, layout]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        setView((v) => {
          const k = clamp(v.k * Math.exp(-e.deltaY * 0.002), 0.05, 2);
          return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
        });
      } else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const zoomBy = (f: number) => {
    const el = viewport.current;
    const cx = (el?.clientWidth ?? 0) / 2;
    const cy = (el?.clientHeight ?? 0) / 2;
    setView((v) => {
      const k = clamp(v.k * f, 0.05, 2);
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });
  };
  const fitWidth = () => {
    const w = viewport.current?.clientWidth ?? layout.width;
    const k = clamp((w - 48) / layout.width, 0.05, 1);
    setView({ k, x: 24, y: 24 });
  };

  // ── search ──────────────────────────────────────────────────────────────────
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => n.title.toLowerCase().includes(needle) || (n.code ?? "").toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, nodes]);
  const pick = (i: number) => {
    select(i);
    setQ("");
  };

  // ── render ──────────────────────────────────────────────────────────────────
  const visibleEdges = edges.filter(([a, b]) => layout.pos[a] && layout.pos[b]);
  const shownLinks = chain ? links.filter(([a, b]) => (a === selected || b === selected) && layout.pos[a] && layout.pos[b]) : [];
  const dim = (i: number) => chain !== null && !chain.has(i) && !compatible.has(i);
  const sel = selected !== null ? nodes[selected]! : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && matches[0] && pick(matches[0].i)}
            placeholder={COPY.search}
            aria-label={COPY.search}
            className="h-8 pl-8"
          />
          {matches.length ? (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-sm shadow-md">
              {matches.map(({ n, i }) => (
                <li key={i}>
                  <button type="button" onClick={() => pick(i)} className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted">
                    <span className="truncate font-medium text-foreground">{n.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {LEVEL_INFO.get(n.level)?.label}
                      {n.code ? ` · ${n.code}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {TABLE_GROUPS.map((g) => (
          <Button
            key={g.key}
            size="sm"
            variant={streams.has(g.key) ? "secondary" : "outline"}
            aria-pressed={streams.has(g.key)}
            onClick={() =>
              setStreams((s) => {
                const x = new Set(s);
                if (x.has(g.key)) x.delete(g.key);
                else x.add(g.key);
                return x.size ? x : s;
              })
            }
          >
            {g.label}
          </Button>
        ))}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger size="sm" className="w-44" aria-label={COPY.status}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{COPY.allStatuses}</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon-sm" variant="outline" onClick={() => zoomBy(1 / 1.25)} aria-label={COPY.zoomOut}>
            <Minus />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(view.k * 100)}%</span>
          <Button size="icon-sm" variant="outline" onClick={() => zoomBy(1.25)} aria-label={COPY.zoomIn}>
            <Plus />
          </Button>
          <Button size="sm" variant="outline" onClick={fitWidth}>
            <Maximize2 /> {COPY.fit}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{COPY.hint}</p>

      <div
        ref={viewport}
        className="relative min-h-[32rem] flex-1 cursor-grab touch-none overflow-hidden rounded-md border border-border bg-muted/30 active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: layout.width, height: layout.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          <svg width={layout.width} height={layout.height} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
            <defs>
              <marker id="spec-map-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="var(--muted-foreground)" />
              </marker>
              <marker id="spec-map-arrow-on" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="var(--foreground)" />
              </marker>
            </defs>
            {visibleEdges.map(([a, b]) => {
              const on = chain !== null && chain.has(a) && chain.has(b);
              return (
                <path
                  key={`${a}-${b}`}
                  d={curve(layout.pos[a]!, layout.pos[b]!)}
                  fill="none"
                  stroke={on ? "var(--foreground)" : "var(--muted-foreground)"}
                  strokeOpacity={chain === null ? 0.35 : on ? 0.9 : 0.08}
                  strokeWidth={on ? 1.75 : 1}
                  markerEnd={`url(#${on ? "spec-map-arrow-on" : "spec-map-arrow"})`}
                />
              );
            })}
            {shownLinks.map(([a, b]) => (
              <path key={`l${a}-${b}`} d={curve(layout.pos[b]!, layout.pos[a]!)} fill="none" stroke="var(--foreground)" strokeOpacity={0.7} strokeDasharray="6 4" strokeWidth={1.5} />
            ))}
          </svg>

          {layout.columns.map((c) => (
            <div key={c.level} className="absolute flex items-center gap-2" style={{ left: c.x, top: c.y, width: CARD_W, height: HEAD_H - 12 }}>
              <span className="size-3 shrink-0 rounded-sm" style={{ background: c.colour }} />
              <button
                type="button"
                onClick={() => setCollapsed((s) => { const x = new Set(s); if (x.has(c.level)) x.delete(c.level); else x.add(c.level); return x; })}
                className="flex min-w-0 items-center gap-1 text-sm font-semibold text-foreground hover:underline"
                aria-expanded={!c.collapsed}
              >
                {c.collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                <span className="truncate">{c.label}</span>
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">{c.collapsed || c.shown === c.total ? c.total : `${c.shown}/${c.total}`}</span>
            </div>
          ))}
          {layout.columns
            .filter((c) => c.collapsed)
            .map((c) => (
              <button
                key={`${c.level}-collapsed`}
                type="button"
                onClick={() => setCollapsed((s) => { const x = new Set(s); x.delete(c.level); return x; })}
                className="absolute rounded-md border border-dashed border-border bg-card px-3 text-left text-xs text-muted-foreground hover:bg-muted"
                style={{ left: c.x, top: HEAD_H, width: CARD_W, height: CARD_H }}
              >
                {COPY.collapsed(c.total)}
              </button>
            ))}

          {nodes.map((n, i) => {
            const p = layout.pos[i];
            if (!p) return null;
            const info = LEVEL_INFO.get(n.level);
            return (
              <button
                key={i}
                type="button"
                onClick={() => select(i)}
                title={n.title}
                className={`absolute flex flex-col justify-center rounded-md border border-l-4 bg-card px-2.5 text-left shadow-xs transition-opacity hover:bg-muted ${
                  i === selected ? "ring-2 ring-foreground" : compatible.has(i) ? "ring-2 ring-[var(--chart-2)]" : ""
                } ${dim(i) ? "opacity-25" : ""}`}
                style={{ left: p.x, top: p.y, width: CARD_W, height: CARD_H, borderLeftColor: LEVEL_COLOURS[(info?.index ?? 0) % LEVEL_COLOURS.length] }}
              >
                <span className="w-full truncate text-xs font-medium text-foreground">{n.title}</span>
                <span className="w-full truncate text-[11px] text-muted-foreground">
                  {[n.code, n.status, n.sub].filter(Boolean).join(" · ") || "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={sel !== null} onOpenChange={(open) => {
          if (open) return;
          setSelected(null);
          setRecord(null);
          setCompatible(new Set());
        }} modal={false}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl" onInteractOutside={(e) => e.preventDefault()}>
          <SheetHeader className="border-b border-border">
            <SheetTitle className="text-sm font-medium text-muted-foreground">{sel ? LEVEL_INFO.get(sel.level)?.label : ""}</SheetTitle>
            <SheetDescription asChild>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {sel ? (
                  <Link href={recordHref(sel.level, sel.id)} className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
                    {COPY.openFullPage} <ArrowUpRight className="size-3.5" />
                  </Link>
                ) : null}
                {compatible.size ? <span>{COPY.compatible(compatible.size)}</span> : null}
              </div>
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 p-4">
            {selected === null ? null : !record || record.for !== selected ? (
              <p className="text-sm text-muted-foreground">{COPY.loading}</p>
            ) : !record.res.ok ? (
              <p role="alert" className="text-sm text-destructive">{COPY.unreachable} ({record.res.error})</p>
            ) : !record.res.data ? (
              <p className="text-sm text-muted-foreground">{COPY.notFound}</p>
            ) : (
              <SpecRecordView record={record.res.data as CatalogRecord} heading="h2" onSelect={selectBy} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function adjacency(n: number, edges: [number, number][], from: 0 | 1, to: 0 | 1): number[][] {
  const out: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) out[e[from]]!.push(e[to]);
  return out;
}

/** Parent's right edge → child's left edge, as a gentle S. */
function curve(a: Pos, b: Pos): string {
  const x1 = a.x + CARD_W;
  const y1 = a.y + CARD_H / 2;
  const x2 = b.x - 2;
  const y2 = b.y + CARD_H / 2;
  const dx = Math.max(Math.abs(x2 - x1) / 2, 40);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
