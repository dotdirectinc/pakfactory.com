"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Layers2,
  Layers3,
  Search,
  Square,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { Label } from "@pakfactory/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pakfactory/ui/components/select";
import { Switch } from "@pakfactory/ui/components/switch";
import { Tabs, TabsList, TabsTrigger } from "@pakfactory/ui/components/tabs";
import {
  TABLE_GROUPS,
  recordHref,
  type TableKey,
} from "@/lib/spec/catalog-table-model";
import type { CatalogRecord } from "@/lib/spec/catalog-record";
import type { SpecMapData } from "@/lib/spec/spec-map";
import type { ProductOptionState } from "@/lib/spec/product-view";
import { SpecRecordView } from "@/components/spec/spec-record-view";
import {
  loadMapCompatible,
  loadMapRecord,
} from "@/app/(admin)/spec/map/actions";
import { ADMIN_SPEC_MAP_COPY as COPY } from "@/lib/copy/spec";

/**
 * The Spec Map (PROD-2960): one of the Catalog's three streams at a time, one column per level,
 * cards joined by arrows parent → child. Read-only.
 *
 * Eric, 2026-10-09:
 *   · colour means status (green active, yellow active internal, red not active); levels are told
 *     apart by a numbered header and an icon;
 *   · no zoom or pan — a plain scrolling area, columns sized to fill its width;
 *   · selecting a card slides it and its related cards into a compact group at the top
 *     and fades everything else out; the record slides in from the right.
 *
 * Laid out here from fixed card heights — no measuring, no layout library: each column is ordered by
 * its parents' positions, so arrows mostly run straight across.
 */

const CARD_H = 48;
const ROW_H = 56;
const HEAD_H = 48;
const GUTTER = 72;
const MIN_COL_W = 240;
const PAD = 16;
const MOVE_MS = 450;
/**
 * Line colours, solid (not translucent) so overlapping lines merge instead of darkening:
 * resting, related to the selection, and unrelated while dimmed.
 */
const LINE = {
  rest: "color-mix(in oklab, var(--muted-foreground) 45%, var(--background))",
  on: "color-mix(in oklab, var(--foreground) 80%, var(--background))",
  dim: "color-mix(in oklab, var(--muted-foreground) 15%, var(--background))",
} as const;
const PANEL_W = 544;
/** The gap between the map and the panel (Tailwind gap-3). */
const PANEL_GAP = 12;
const MOVE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Many-to-many and large: shown on demand. */
const COLLAPSED_AT_START: TableKey[] = ["productValue", "optionValue"];
const ALL = "all";
/**
 * A focused standard product's offered options, by how the product gets them (as Studio's product
 * view shows them): listed by the product itself, derived by the rules, added by an exception.
 * Told apart by line style, since colour means status.
 */
const OFFER_ORDER: ProductOptionState[] = ["listed", "derived", "added"];
const OFFER_DASH: Record<ProductOptionState, string | undefined> = {
  listed: undefined,
  derived: "6 4",
  added: "1 3",
};
/**
 * The offered-options column, top to bottom: a filter box, then one group per kind — a header the
 * product's line runs to, and when open, its options under their customization type, hung off a rail
 * in the group's line style. Only Direct starts open, so a product with 80 options starts short.
 */
const FILTER_H = 44;
const GROUP_H = 36;
const GROUP_ROW = 44;
const TYPE_H = 24;
const GROUP_GAP = 8;
const INDENT = 20;
const RAIL = 8;

type OfferGroup = {
  state: ProductOptionState;
  y: number;
  /** Options matching the filter, of `total`. */
  shown: number;
  total: number;
  open: boolean;
};
type OfferLayout = {
  x: number;
  filterY: number;
  groups: OfferGroup[];
  types: { key: string; title: string; y: number }[];
  rails: { state: ProductOptionState; y1: number; ticks: number[] }[];
};

/**
 * One icon per depth, the same in every stream (Eric, 2026-10-09), high to low: a group of groups,
 * a group, one record, an attribute of records.
 */
const DEPTH_ICON: LucideIcon[] = [Layers3, Layers2, Square, Tag];
const iconOf = (level: TableKey) =>
  DEPTH_ICON[LEVEL_INFO.get(level)?.index ?? 0] ?? Square;

/** Status → badge colour. Anything else (coming soon) is neutral grey. */
const STATUS_DOT: Record<string, string> = {
  active: "bg-green-500",
  "active-internal": "bg-yellow-400",
  "not-active": "bg-red-500",
};
const statusDot = (s: string | null) =>
  s ? (STATUS_DOT[s] ?? "bg-muted-foreground/50") : null;

type Pos = { x: number; y: number };
type Placed = { pos: Map<number, Pos>; height: number };

const LEVEL_INFO = new Map(
  TABLE_GROUPS.flatMap((g) =>
    g.levels.map(
      (l, i) => [l.key, { stream: g.key, label: l.label, index: i }] as const,
    ),
  ),
);
/**
 * Shorter column names on the map: inside the Products tab the "Product" prefix only repeats the
 * tab, and in narrow columns it pushed the names into "…" (Richard, 2026-10-09). The full name stays
 * in the header's tooltip, and the Catalog and the panel keep theirs.
 */
const MAP_LABEL: Partial<Record<TableKey, string>> = {
  productLine: "Lines",
  productStyle: "Styles",
  product: "Standard",
  productValue: "Property values",
};
const mapLabelOf = (level: TableKey) =>
  MAP_LABEL[level] ?? LEVEL_INFO.get(level)?.label;
const streamOf = (level: TableKey) =>
  LEVEL_INFO.get(level)?.stream ?? TABLE_GROUPS[0]!.key;

/** Columns left to right, each ordered by where its parents sit (their mean row); no parent → last. */
function place(
  levels: TableKey[],
  cardsOf: (level: TableKey, column: number) => number[],
  parentsOf: number[][],
  colW: number,
): Placed {
  const pos = new Map<number, Pos>();
  let height = HEAD_H + ROW_H;
  levels.forEach((level, li) => {
    const shown = cardsOf(level, li);
    const rank = (i: number) => {
      const ys = (parentsOf[i] ?? [])
        .map((p) => pos.get(p)?.y)
        .filter((y): y is number => y !== undefined);
      return ys.length
        ? ys.reduce((a, b) => a + b, 0) / ys.length
        : Number.POSITIVE_INFINITY;
    };
    const ordered =
      li === 0
        ? shown
        : shown
            .map((i, o) => ({ i, r: rank(i), o }))
            .sort((a, b) => a.r - b.r || a.o - b.o)
            .map((x) => x.i);
    ordered.forEach((i, row) =>
      pos.set(i, { x: PAD + li * colW, y: HEAD_H + row * ROW_H }),
    );
    height = Math.max(height, HEAD_H + Math.max(ordered.length, 1) * ROW_H);
  });
  return { pos, height };
}

export function SpecMap({ data }: { data: SpecMapData }) {
  const { nodes, edges, links } = data;
  const [stream, setStream] = useState<string>(TABLE_GROUPS[0]!.key);
  const [collapsed, setCollapsed] = useState<Set<TableKey>>(
    () => new Set(COLLAPSED_AT_START),
  );
  const [status, setStatus] = useState<string>(ALL);
  const [selected, setSelected] = useState<number | null>(null);
  const [onlyRelated, setOnlyRelated] = useState(true);
  const [scrollTo, setScrollTo] = useState<number | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [rowW, setRowW] = useState(1200);

  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    setRowW(el.clientWidth);
    const ro = new ResizeObserver(() => setRowW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const parentsOf = useMemo(
    () => adjacency(nodes.length, edges, 1, 0),
    [nodes.length, edges],
  );
  const childrenOf = useMemo(
    () => adjacency(nodes.length, edges, 0, 1),
    [nodes.length, edges],
  );
  const linksOf = useMemo(() => {
    const m = new Map<number, number[]>();
    for (const [a, b] of links) {
      m.set(a, [...(m.get(a) ?? []), b]);
      m.set(b, [...(m.get(b) ?? []), a]);
    }
    return m;
  }, [links]);
  const byLevel = useMemo(() => {
    const m = new Map<TableKey, number[]>();
    nodes.forEach((n, i) => m.set(n.level, [...(m.get(n.level) ?? []), i]));
    return m;
  }, [nodes]);
  const statuses = useMemo(
    () =>
      [
        ...new Set(
          nodes.map((n) => n.status).filter((s): s is string => Boolean(s)),
        ),
      ].sort(),
    [nodes],
  );

  // ── selection: the chain up and down, cross-stream links, and the rules' compatibility ──
  const [compatible, setCompatible] = useState<Set<number>>(new Set());
  const [offers, setOffers] = useState<Map<number, ProductOptionState>>(
    new Map(),
  );
  /** Kept from product to product, so the same question can be asked of the next one. */
  const [offerKinds, setOfferKinds] = useState<Set<ProductOptionState>>(
    () => new Set(OFFER_ORDER),
  );
  const [openGroups, setOpenGroups] = useState<Set<ProductOptionState>>(
    () => new Set<ProductOptionState>(["listed"]),
  );
  const [offerQ, setOfferQ] = useState("");
  const [record, setRecord] = useState<{
    for: number;
    res: Awaited<ReturnType<typeof loadMapRecord>>;
  } | null>(null);
  const [, startLoading] = useTransition();

  /** Everything connected to the selection; cross-stream records come with their own parents, for context. */
  const related = useMemo(() => {
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
    for (const other of [...(linksOf.get(selected) ?? []), ...compatible]) {
      out.add(other);
      walk(other, parentsOf);
    }
    return out;
  }, [selected, parentsOf, childrenOf, linksOf, compatible]);

  useEffect(() => {
    if (selected === null) return;
    const n = nodes[selected]!;
    setCompatible(new Set());
    setOffers(new Map());
    setOfferQ("");
    startLoading(async () => {
      const [rec, compat] = await Promise.all([
        loadMapRecord(n.level, n.id),
        loadMapCompatible(n.level, n.id),
      ]);
      setRecord({ for: selected, res: rec });
      if (compat.ok) {
        const want = new Map<string, ProductOptionState | null>([
          ...compat.data.products.map((id) => [`product:${id}`, null] as const),
          ...compat.data.options.map(
            (o) => [`customizationOption:${o.id}`, o.state] as const,
          ),
        ]);
        const found = nodes.flatMap((m, i) => {
          const k = `${m.level}:${m.id}`;
          return want.has(k) ? [[i, want.get(k)!] as const] : [];
        });
        setCompatible(new Set(found.map(([i]) => i)));
        setOffers(
          new Map(
            found.flatMap(([i, state]) => (state ? [[i, state] as const] : [])),
          ),
        );
      }
    });
  }, [selected, nodes]);

  const relatedByStream = useMemo(() => {
    const m = new Map<string, number>();
    if (!related) return m;
    for (const i of related)
      m.set(
        streamOf(nodes[i]!.level),
        (m.get(streamOf(nodes[i]!.level)) ?? 0) + 1,
      );
    return m;
  }, [related, nodes]);

  const focusing = onlyRelated && related !== null;

  /** The panel's width, so the map's columns for the new selection are known in the same render. */
  const panelW =
    selected !== null ? Math.min(PANEL_W, Math.floor(rowW * 0.45)) : 0;
  const areaW = rowW - (panelW ? panelW + PANEL_GAP : 0);

  // ── layout: the current stream; the resting layout, and the focused one when a card is selected ──
  const group = TABLE_GROUPS.find((g) => g.key === stream) ?? TABLE_GROUPS[0]!;
  /**
   * A focused standard product brings the options it offers into its own stream, as a column right
   * after it, so the product → option lines run straight across. Known from the selection alone, so
   * the columns are settled before the cards glide; the options rise in once the rules answer.
   */
  const offering =
    focusing &&
    nodes[selected!]!.level === "product" &&
    stream === streamOf("product");
  const levels = useMemo(() => {
    const own = group.levels.map((l) => l.key);
    if (!offering) return own;
    const at = own.indexOf("product") + 1;
    return [
      ...own.slice(0, at),
      "customizationOption" as TableKey,
      ...own.slice(at),
    ];
  }, [group, offering]);
  const colW = Math.max(
    MIN_COL_W,
    Math.floor((areaW - PAD * 2) / levels.length),
  );
  const cardW = colW - GUTTER;
  /** Headers run on into the gutter (nothing is drawn there at their height), so names fit narrow columns. */
  const headW = colW - 16;
  const statusOk = useCallback(
    (i: number) =>
      status === ALL || !nodes[i]!.status || nodes[i]!.status === status,
    [status, nodes],
  );

  const rest = useMemo(
    () =>
      place(
        levels,
        (level) =>
          collapsed.has(level) || streamOf(level) !== stream
            ? []
            : (byLevel.get(level) ?? []).filter(statusOk),
        parentsOf,
        colW,
      ),
    [levels, collapsed, byLevel, statusOk, parentsOf, colW],
  );
  /** Related cards only, every level open, gathered at the top (Eric, 2026-10-09). */
  const focus = useMemo(() => {
    if (!focusing) return null;
    const f = place(
      levels,
      (level) =>
        streamOf(level) !== stream
          ? []
          : (byLevel.get(level) ?? []).filter(
              (i) => related!.has(i) && statusOk(i),
            ),
      parentsOf,
      colW,
    );
    if (!offering) return { ...f, offer: null };

    // The offered-options column, laid out by hand: filter, then per kind a header and its options by type.
    const x = PAD + levels.indexOf("customizationOption") * colW;
    const needle = offerQ.trim().toLowerCase();
    const matches = (i: number) =>
      !needle ||
      nodes[i]!.title.toLowerCase().includes(needle) ||
      (nodes[i]!.code ?? "").toLowerCase().includes(needle);
    const typeOf = (i: number) => parentsOf[i]?.[0];
    const offer: OfferLayout = { x, filterY: HEAD_H, groups: [], types: [], rails: [] };
    let y = HEAD_H + FILTER_H;
    for (const state of OFFER_ORDER) {
      if (!offerKinds.has(state)) continue;
      const all = [...offers]
        .filter(([i, k]) => k === state && statusOk(i))
        .map(([i]) => i);
      const hit = all.filter(matches);
      // Filtering opens every group with a match and closes the rest.
      const open = hit.length > 0 && (needle ? true : openGroups.has(state));
      offer.groups.push({ state, y, shown: hit.length, total: all.length, open });
      const y1 = y + GROUP_H;
      y += GROUP_ROW;
      if (!open) {
        y += GROUP_GAP;
        continue;
      }
      // By customization type, in the order the types sit under their categories.
      const byType = new Map<number, number[]>();
      for (const i of hit) {
        const t = typeOf(i) ?? -1;
        byType.set(t, [...(byType.get(t) ?? []), i]);
      }
      const typeRank = (t: number) => [parentsOf[t]?.[0] ?? -1, t] as const;
      const ticks: number[] = [];
      for (const [t, cards] of [...byType].sort((a, b) => {
        const [ca, ta] = typeRank(a[0]);
        const [cb, tb] = typeRank(b[0]);
        return ca - cb || ta - tb;
      })) {
        offer.types.push({
          key: `${state}:${t}`,
          title: t >= 0 ? nodes[t]!.title : COPY.otherType,
          y,
        });
        y += TYPE_H;
        for (const i of cards.sort((a, b) =>
          nodes[a]!.title.localeCompare(nodes[b]!.title),
        )) {
          f.pos.set(i, { x: x + INDENT, y });
          ticks.push(y + CARD_H / 2);
          y += ROW_H;
        }
      }
      offer.rails.push({ state, y1, ticks });
      y += GROUP_GAP;
    }
    return { ...f, height: Math.max(f.height, y), offer };
  }, [
    focusing,
    offering,
    offers,
    offerKinds,
    openGroups,
    offerQ,
    nodes,
    stream,
    levels,
    byLevel,
    related,
    statusOk,
    parentsOf,
    colW,
  ]);

  const targetOf = (i: number) =>
    focus ? (focus.pos.get(i) ?? rest.pos.get(i)) : rest.pos.get(i);

  /*
   * Cards glide only when the selection changes — never on a resize, a filter or a collapse — and
   * they glide from where they were ON SCREEN (Eric, 2026-10-09): the map jumps to where the new
   * layout should be seen (the top when focusing, the record's place when clearing), each card is
   * first drawn where it appeared before the jump, then moves to its new place.
   */
  const focusKey = focusing ? `${selected}` : "rest";
  const lastFocusKey = useRef(focusKey);
  const lastSelected = useRef<number | null>(selected);
  const shown = useRef<{ pos: Map<number, Pos> }>({ pos: new Map() });
  const [from, setFrom] = useState<{
    pos: Map<number, Pos>;
    dy: number;
  } | null>(null);
  const [moving, setMoving] = useState(false);
  useLayoutEffect(() => {
    if (lastFocusKey.current === focusKey) return;
    const clearedFrom = focusKey === "rest" ? lastSelected.current : null;
    lastFocusKey.current = focusKey;
    const el = area.current;
    if (!el) return;
    const before = shown.current;
    const back = clearedFrom !== null ? rest.pos.get(clearedFrom) : undefined;
    const was = el.scrollTop; // live: scrolling does not re-render
    const top = focus
      ? 0
      : back
        ? Math.max(0, back.y - el.clientHeight / 3)
        : el.scrollTop;
    el.scrollTop = top;
    setFrom({ pos: before.pos, dy: top - was });
    setMoving(false);
    // Not cancelled when the related set grows mid-move (the rules' compatibility arrives later):
    // the move must always finish.
    // A timer, not animation frames: frames pause in a background tab, and the move must finish.
    window.setTimeout(() => {
      setFrom(null);
      setMoving(true);
      window.setTimeout(() => setMoving(false), MOVE_MS + 100);
    }, 32);
  }, [focusKey]); // focus and rest are this render's, read once when the key changes
  useLayoutEffect(() => {
    lastSelected.current = selected;
  }, [selected]);

  const posOf = (i: number) => {
    const start = from?.pos.get(i);
    return start ? { x: start.x, y: start.y + from!.dy } : targetOf(i);
  };
  const height = Math.max(rest.height, focus?.height ?? 0);
  const width = PAD * 2 + levels.length * colW;

  // ── selection ───────────────────────────────────────────────────────────────
  /**
   * Select a record. Its related cards gather at the top, so the map scrolls up with them; a record
   * reached another way (search, a panel link) is brought in first: its stream's tab, its level
   * open, its status kept.
   */
  const select = useCallback(
    (i: number, bringIntoView: boolean) => {
      const n = nodes[i]!;
      if (bringIntoView) {
        setStream(streamOf(n.level));
        if (collapsed.has(n.level))
          setCollapsed((c) => {
            const x = new Set(c);
            x.delete(n.level);
            return x;
          });
        if (status !== ALL && n.status && n.status !== status) setStatus(ALL);
      }
      setSelected(i);
      if (bringIntoView) setScrollTo(i);
    },
    [nodes, collapsed, status],
  );
  const selectBy = useCallback(
    (level: TableKey, id: string) => {
      const i = nodes.findIndex((n) => n.level === level && n.id === id);
      if (i >= 0)
        select(
          i,
          streamOf(level) !== stream || !(related?.has(i) ?? rest.pos.has(i)),
        );
    },
    [nodes, select, stream, related, rest],
  );
  const clearSelection = () => {
    setSelected(null);
    setRecord(null);
    setCompatible(new Set());
  };

  // Scroll a record into view once it is laid out (search, panel links, "related in…").
  useEffect(() => {
    if (scrollTo === null) return;
    const p = targetOf(scrollTo);
    const el = area.current;
    if (!p || !el) return;
    // Gathered at the top: show the top. Otherwise put the card a third of the way down.
    el.scrollTo({
      left: Math.max(0, p.x - el.clientWidth / 2 + cardW / 2),
      top: focus ? 0 : Math.max(0, p.y - el.clientHeight / 3),
      behavior: "smooth",
    });
    setScrollTo(null);
  }, [scrollTo, focus, rest, cardW]);
  useEffect(() => {
    area.current?.scrollTo({ left: 0, top: 0 });
  }, [stream]);

  useLayoutEffect(() => {
    const pos = new Map<number, Pos>();
    for (const i of drawn) if (onMap(i) && !isGone(i)) pos.set(i, posOf(i)!);
    shown.current = { pos };
  });

  // ── search (every stream) ─────────────────────────────────────────────────────
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return nodes
      .map((n, i) => ({ n, i }))
      .filter(
        ({ n }) =>
          n.title.toLowerCase().includes(needle) ||
          (n.code ?? "").toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [q, nodes]);
  const pick = (i: number) => {
    select(i, true);
    setQ("");
  };

  // ── render ──────────────────────────────────────────────────────────────────
  const inStream = (i: number) => streamOf(nodes[i]!.level) === stream;
  /** Drawn in this stream: its own records, and a focused product's offered options. */
  const onMap = (i: number) => inStream(i) || (offering && offers.has(i));
  const isGone = (i: number) =>
    from
      ? !from.pos.has(i)
      : focus !== null &&
        ((related !== null && !related.has(i)) || !focus.pos.has(i));
  /** Cards to draw: the resting ones, plus related cards from collapsed levels while focusing. */
  const drawn = useMemo(() => {
    const s = new Set(rest.pos.keys());
    if (focus) for (const i of focus.pos.keys()) s.add(i);
    return [...s];
  }, [rest, focus]);
  const arrows = focus
    ? edges.filter(([a, b]) => focus.pos.has(a) && focus.pos.has(b))
    : edges.filter(([a, b]) => rest.pos.has(a) && rest.pos.has(b));
  /** Laid out and settled: the offered-options column's own parts (filter, group headers, rails). */
  const offerUi =
    offering && focus?.offer && !from && focus.pos.has(selected!)
      ? focus.offer
      : null;
  /** Options per kind (status filter applied), for the focus bar's chips. */
  const offerCount = (state: ProductOptionState) =>
    [...offers].filter(([i, k]) => k === state && statusOk(i)).length;
  const toggleKind = (state: ProductOptionState) =>
    setOfferKinds((ks) => {
      // From "all": show only this kind. Otherwise toggle it; turning off the last one shows all again.
      if (ks.size === OFFER_ORDER.length) return new Set([state]);
      const x = new Set(ks);
      if (x.has(state)) x.delete(state);
      else x.add(state);
      return x.size ? x : new Set(OFFER_ORDER);
    });
  const sel = selected !== null ? nodes[selected]! : null;
  const relatedIn = (level: TableKey) =>
    related ? [...related].filter((i) => nodes[i]!.level === level).length : 0;
  const elsewhere = TABLE_GROUPS.filter(
    (g) => g.key !== stream && (relatedByStream.get(g.key) ?? 0) > 0,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <Tabs value={stream} onValueChange={setStream}>
          <TabsList variant="line">
            {TABLE_GROUPS.map((g) => (
              <TabsTrigger key={g.key} value={g.key}>
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3 pb-2 text-xs text-muted-foreground">
          {(["active", "active-internal", "not-active", "other"] as const).map(
            (s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span
                  className={`size-2.5 rounded-full ${statusDot(s) ?? ""}`}
                />
                {COPY.statusLabel[s]}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && matches[0] && pick(matches[0].i)
            }
            placeholder={COPY.search}
            aria-label={COPY.search}
            className="h-8 pl-8"
          />
          {matches.length ? (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-sm shadow-md">
              {matches.map(({ n, i }) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="truncate font-medium text-foreground">
                      {n.title}
                    </span>
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
        <div className="flex items-center gap-2">
          <Switch
            id="spec-map-only-related"
            checked={onlyRelated}
            onCheckedChange={setOnlyRelated}
          />
          <Label
            htmlFor="spec-map-only-related"
            className="text-sm font-normal text-muted-foreground"
          >
            {COPY.onlyRelated}
          </Label>
        </div>
      </div>

      <div className="flex h-9 shrink-0 items-center">
        {sel ? (
          <div className="flex h-9 w-full min-w-0 items-center gap-3 overflow-hidden rounded-md border border-border bg-card px-3 text-sm">
            <span className="text-muted-foreground">{COPY.focusedOn}</span>
            <span className="truncate font-medium text-foreground">
              {sel.title}
            </span>
            {offering && offers.size ? (
              <span
                role="group"
                aria-label={COPY.offerKinds}
                className="flex shrink-0 items-center gap-1"
              >
                {OFFER_ORDER.map((k) => (
                  <Button
                    key={k}
                    size="xs"
                    variant={offerKinds.has(k) ? "secondary" : "ghost"}
                    aria-pressed={offerKinds.has(k)}
                    title={COPY.offerKind[k]}
                    onClick={() => toggleKind(k)}
                    className={offerKinds.has(k) ? "" : "text-muted-foreground"}
                  >
                    <OfferSwatch state={k} />
                    {COPY.offerChip[k]}
                    <span className="tabular-nums text-muted-foreground">
                      {offerCount(k)}
                    </span>
                  </Button>
                ))}
              </span>
            ) : null}
            {elsewhere.map((g) => (
              <Button
                key={g.key}
                size="xs"
                variant="outline"
                onClick={() => {
                  setStream(g.key);
                  const first = [...related!].find(
                    (i) => streamOf(nodes[i]!.level) === g.key,
                  );
                  if (first !== undefined) setScrollTo(first);
                }}
              >
                {COPY.relatedIn(relatedByStream.get(g.key)!, g.label)}
              </Button>
            ))}
            <Button
              size="xs"
              variant="ghost"
              className="ml-auto"
              onClick={clearSelection}
            >
              {COPY.clear}
            </Button>
          </div>
        ) : (
          <p className="truncate text-xs text-muted-foreground">{COPY.hint}</p>
        )}
      </div>

      <div ref={row} className="flex min-h-[28rem] flex-1 gap-3">
        <div
          ref={area}
          className="relative min-w-0 flex-1 overflow-auto rounded-md border border-border bg-muted/30"
        >
          <div className="relative" style={{ width, height: height + PAD }}>
            <svg
              width={width}
              height={height}
              className="pointer-events-none absolute inset-0"
              aria-hidden
            >
              <defs>
                {(["rest", "on", "dim"] as const).map((k) => (
                  <marker
                    key={k}
                    id={`spec-map-arrow-${k}`}
                    viewBox="0 0 8 8"
                    refX="8"
                    refY="4"
                    markerWidth="6"
                    markerHeight="6"
                    markerUnits="userSpaceOnUse"
                    orient="auto"
                  >
                    <path d="M0,0.5 L8,4 L0,7.5 z" fill={LINE[k]} />
                  </marker>
                ))}
              </defs>
              {/* Focused: only the related arrows, drawn at their new places once the cards have moved. */}
              <g
                key={`${focusKey}-${stream}`}
                fill="none"
                strokeLinejoin="round"
                className={
                  from
                    ? "hidden"
                    : "animate-in fade-in fill-mode-backwards duration-200 delay-500"
                }
              >
                {arrows.map(([a, b]) => {
                  const k =
                    related === null
                      ? "rest"
                      : related.has(a) && related.has(b)
                        ? "on"
                        : "dim";
                  return (
                    <path
                      key={`${a}-${b}`}
                      d={elbow(posOf(a)!, posOf(b)!, cardW, colW)}
                      stroke={LINE[k]}
                      strokeWidth={k === "on" ? 1.25 : 1}
                      markerEnd={`url(#spec-map-arrow-${k})`}
                    />
                  );
                })}
              </g>
              {/* Separate from the arrows above: the offers arrive after the move, and fade in on their own. */}
              <g
                key={`offers-${selected}-${offers.size}-${offerUi ? 1 : 0}`}
                fill="none"
                strokeLinejoin="round"
                className="animate-in fade-in fill-mode-backwards duration-200 delay-300"
              >
                {offerUi?.groups.map((g) => (
                  <path
                    key={g.state}
                    // To the header's middle: elbow() aims at a card's middle, so shift the target to match.
                    d={elbow(
                      posOf(selected!)!,
                      { x: offerUi.x, y: g.y + GROUP_H / 2 - CARD_H / 2 },
                      cardW,
                      colW,
                    )}
                    stroke={g.total ? LINE.on : LINE.rest}
                    strokeWidth={1.25}
                    strokeDasharray={OFFER_DASH[g.state]}
                    strokeLinecap={g.state === "added" ? "round" : undefined}
                    markerEnd={`url(#spec-map-arrow-${g.total ? "on" : "rest"})`}
                  />
                ))}
                {offerUi?.rails.map((r) =>
                  r.ticks.length ? (
                    <path
                      key={`rail-${r.state}`}
                      d={`M${offerUi.x + RAIL},${r.y1} V${r.ticks.at(-1)}${r.ticks
                        .map((t) => ` M${offerUi.x + RAIL},${t} H${offerUi.x + INDENT - 1}`)
                        .join("")}`}
                      stroke={LINE.on}
                      strokeDasharray={OFFER_DASH[r.state]}
                      strokeLinecap={r.state === "added" ? "round" : undefined}
                    />
                  ) : null,
                )}
              </g>
            </svg>

            {levels.map((level, li) => {
              const Icon = iconOf(level);
              if (streamOf(level) !== stream)
                return (
                  <div
                    key={level}
                    className="absolute flex items-center gap-2"
                    style={{
                      left: PAD + li * colW,
                      top: 8,
                      width: headW,
                      height: HEAD_H - 16,
                    }}
                  >
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="flex min-w-0 items-center gap-1 text-sm font-semibold text-foreground">
                      <ChevronDown className="size-4 shrink-0" />
                      <span className="truncate">{COPY.offered}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {offers.size ? [...offers.keys()].filter(statusOk).length : "…"}
                    </span>
                  </div>
                );
              const total = (byLevel.get(level) ?? []).length;
              const isCollapsed = collapsed.has(level);
              const count = focus
                ? relatedIn(level)
                : isCollapsed
                  ? total
                  : (byLevel.get(level) ?? []).filter((i) => rest.pos.has(i))
                      .length;
              return (
                <div
                  key={level}
                  className="absolute flex items-center gap-2"
                  style={{
                    left: PAD + li * colW,
                    top: 8,
                    width: headW,
                    height: HEAD_H - 16,
                  }}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {(LEVEL_INFO.get(level)?.index ?? li) + 1}
                  </span>
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((s) => {
                        const x = new Set(s);
                        if (x.has(level)) x.delete(level);
                        else x.add(level);
                        return x;
                      })
                    }
                    // While a card is selected every level shows its related cards, collapsed or not: one
                    // chevron for all, and the toggle waits until the selection is cleared (Eric, 2026-10-09).
                    disabled={focus !== null}
                    className="flex min-w-0 items-center gap-1 text-sm font-semibold text-foreground enabled:hover:underline disabled:cursor-default"
                    aria-expanded={focus !== null || !isCollapsed}
                    title={LEVEL_INFO.get(level)?.label}
                  >
                    {isCollapsed && focus === null ? (
                      <ChevronRight className="size-4 shrink-0" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0" />
                    )}
                    <span className="truncate">{mapLabelOf(level)}</span>
                  </button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {count === total ? total : `${count}/${total}`}
                  </span>
                </div>
              );
            })}
            {focus
              ? null
              : levels
                  .map((level, li) => ({ level, li }))
                  .filter(({ level }) => collapsed.has(level))
                  .map(({ level, li }) => (
                    <button
                      key={`${level}-collapsed`}
                      type="button"
                      onClick={() =>
                        setCollapsed((s) => {
                          const x = new Set(s);
                          x.delete(level);
                          return x;
                        })
                      }
                      className="absolute rounded-md border border-dashed border-border bg-card px-3 text-left text-xs text-muted-foreground hover:bg-muted"
                      style={{
                        left: PAD + li * colW,
                        top: HEAD_H,
                        width: cardW,
                        height: CARD_H,
                      }}
                    >
                      {COPY.collapsed((byLevel.get(level) ?? []).length)}
                    </button>
                  ))}

            {offerUi ? (
              <div className="animate-in fade-in duration-200">
                <div
                  className="absolute"
                  style={{
                    left: offerUi.x,
                    top: offerUi.filterY + 4,
                    width: cardW,
                  }}
                >
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={offerQ}
                    onChange={(e) => setOfferQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setOfferQ("")}
                    placeholder={COPY.filterOffers}
                    aria-label={COPY.filterOffers}
                    className="h-8 bg-card pl-8 text-xs"
                  />
                </div>
                {offerUi.groups.map((g) => (
                  <button
                    key={g.state}
                    type="button"
                    disabled={!g.total || Boolean(offerQ.trim())}
                    aria-expanded={g.open}
                    onClick={() =>
                      setOpenGroups((s) => {
                        const x = new Set(s);
                        if (x.has(g.state)) x.delete(g.state);
                        else x.add(g.state);
                        return x;
                      })
                    }
                    className={`absolute flex items-center gap-2 rounded-md border border-border bg-card px-2.5 text-left text-xs font-semibold shadow-xs enabled:hover:bg-muted disabled:cursor-default ${g.total ? "text-foreground" : "text-muted-foreground"}`}
                    style={{
                      left: offerUi.x,
                      top: g.y,
                      width: cardW,
                      height: GROUP_H,
                    }}
                  >
                    {g.open ? (
                      <ChevronDown className="size-4 shrink-0" />
                    ) : (
                      <ChevronRight
                        className={`size-4 shrink-0 ${g.total ? "" : "opacity-40"}`}
                      />
                    )}
                    <OfferSwatch state={g.state} />
                    <span className="truncate">{COPY.offerKind[g.state]}</span>
                    <span className="ml-auto shrink-0 font-normal tabular-nums text-muted-foreground">
                      {offerQ.trim() ? COPY.ofTotal(g.shown, g.total) : g.total}
                    </span>
                  </button>
                ))}
                {offerUi.types.map((t) => (
                  <span
                    key={t.key}
                    className="absolute truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                    style={{
                      left: offerUi.x + INDENT,
                      top: t.y,
                      width: cardW - INDENT,
                      lineHeight: `${TYPE_H}px`,
                    }}
                  >
                    {t.title}
                  </span>
                ))}
              </div>
            ) : null}

            {drawn.map((i) => {
              if (!onMap(i)) return null;
              const n = nodes[i]!;
              const offer = offering ? offers.get(i) : undefined;
              const p = posOf(i)!;
              const Icon = iconOf(n.level);
              const dot = statusDot(n.status);
              const unrelated = related !== null && !related.has(i);
              const gone = isGone(i);
              // A related card from a collapsed level (property values) has no resting place: once the
              // others have moved it rises into its own column from below, row by row (Eric, 2026-10-09).
              // The rise is on an inner layer — an animation on the positioned element would override
              // its translate and start it from the map's top-left corner.
              const arriving = !from && focus !== null && !rest.pos.has(i);
              const row = Math.max(0, Math.round((p.y - HEAD_H) / ROW_H));
              return (
                <div
                  key={i}
                  className={`absolute left-0 top-0 ${gone ? "pointer-events-none opacity-0" : unrelated ? "opacity-25" : "opacity-100"} ${i === selected ? "z-10" : ""}`}
                  style={{
                    width: offer ? cardW - INDENT : cardW,
                    height: CARD_H,
                    transform: `translate(${p.x}px, ${p.y}px)`,
                    transition: moving
                      ? `transform ${MOVE_MS}ms ${MOVE_EASE}, opacity ${MOVE_MS / 1.5}ms ease-out`
                      : undefined,
                    willChange: moving ? "transform, opacity" : undefined,
                  }}
                >
                  <button
                    type="button"
                    // An offered option belongs to the Customizations stream: selecting it goes there.
                    onClick={() => select(i, !inStream(i))}
                    title={[
                      n.title,
                      offer ? COPY.offerKind[offer] : null,
                      n.status,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                    tabIndex={gone ? -1 : undefined}
                    aria-hidden={gone ? true : undefined}
                    className={`flex size-full items-center gap-2 rounded-md border bg-card px-2.5 text-left shadow-xs hover:bg-muted ${
                      i === selected
                        ? "border-foreground ring-2 ring-foreground"
                        : compatible.has(i)
                          ? "border-foreground/60 ring-1 ring-foreground/40"
                          : "border-border"
                    } ${arriving ? "animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards duration-300 ease-out" : ""}`}
                    style={
                      arriving
                        ? {
                            // An offered option also arrives when its group opens, long after the move.
                            animationDelay: `${(offer && !moving ? 0 : MOVE_MS) + Math.min(row, 12) * (offer ? 20 : 30)}ms`,
                          }
                        : undefined
                    }
                  >
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-medium text-foreground">
                        {n.title}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {[n.code, n.sub].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    {dot ? (
                      <span
                        className={`size-2.5 shrink-0 rounded-full ${dot}`}
                        aria-label={n.status ?? undefined}
                      />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* The record slides in from the right and takes its place beside the map (Eric, 2026-10-09). */}
        {sel ? (
          <aside
            aria-label={COPY.panelLabel}
            style={{ width: panelW }}
            className="flex shrink-0 flex-col overflow-hidden rounded-md border border-border bg-card animate-in fade-in slide-in-from-right-8 duration-300"
          >
            <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  {LEVEL_INFO.get(sel.level)?.label}
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <Link
                    href={recordHref(sel.level, sel.id)}
                    className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                  >
                    {COPY.openFullPage} <ArrowUpRight className="size-3.5" />
                  </Link>
                  {compatible.size ? (
                    <span>{COPY.compatible(compatible.size)}</span>
                  ) : null}
                </div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={clearSelection}
                aria-label={COPY.close}
              >
                <X />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
              {!record || record.for !== selected ? (
                <p className="text-sm text-muted-foreground">{COPY.loading}</p>
              ) : !record.res.ok ? (
                <p role="alert" className="text-sm text-destructive">
                  {COPY.unreachable} ({record.res.error})
                </p>
              ) : !record.res.data ? (
                <p className="text-sm text-muted-foreground">{COPY.notFound}</p>
              ) : (
                <SpecRecordView
                  record={record.res.data as CatalogRecord}
                  heading="h2"
                  onSelect={selectBy}
                />
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** A short sample of a kind's line, for the chips and group headers. */
function OfferSwatch({ state }: { state: ProductOptionState }) {
  return (
    <svg width="18" height="6" className="shrink-0" aria-hidden>
      <line
        x1="1"
        y1="3"
        x2="17"
        y2="3"
        stroke={LINE.on}
        strokeWidth={1.5}
        strokeDasharray={OFFER_DASH[state]}
        strokeLinecap={state === "added" ? "round" : undefined}
      />
    </svg>
  );
}

function adjacency(
  n: number,
  edges: [number, number][],
  from: 0 | 1,
  to: 0 | 1,
): number[][] {
  const out: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) out[e[from]]!.push(e[to]);
  return out;
}

/**
 * Parent's right edge → child's left edge as an angled line: out, along a shared vertical just past
 * the parent's column, then in. Every line from one column shares that vertical, so they overlap
 * into one trunk instead of fanning out (Eric, 2026-10-09).
 *
 * A line that skips a column (a focused product's property values, past its offered options) bridges
 * over that column's cards, just under the headers, and comes down the child column's own trunk.
 */
function elbow(a: Pos, b: Pos, cardW: number, colW: number): string {
  const x1 = a.x + cardW;
  const y1 = a.y + CARD_H / 2;
  const x2 = b.x - 1;
  const y2 = b.y + CARD_H / 2;
  const mx = x1 + Math.round(GUTTER / 2);
  if (b.x - a.x > colW * 1.5) {
    const bridge = HEAD_H - 6;
    const mx2 = b.x - Math.round(GUTTER / 2);
    return `M${x1},${y1} H${mx} V${bridge} H${mx2} V${y2} H${x2}`;
  }
  return y1 === y2
    ? `M${x1},${y1} H${x2}`
    : `M${x1},${y1} H${mx} V${y2} H${x2}`;
}
