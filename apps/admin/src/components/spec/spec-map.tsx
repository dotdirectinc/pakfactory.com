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
  CircleMinus,
  CirclePlus,
  Layers2,
  Layers3,
  Pencil,
  Search,
  Box,
  Tag,
  Undo2,
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
import { MAP_OPTION_PROPERTY, MAP_PROPERTY, type MapNode, type SpecMapData } from "@/lib/spec/spec-map";
import type { ProductOptionState } from "@/lib/spec/product-view";
/** How a focused product gets an option, or "removed": the rules give it, an exception takes it away. */
type OfferKind = ProductOptionState | "removed";
import { SpecRecordView } from "@/components/spec/spec-record-view";
import { RuleEditBar, RuleEditPanel, RuleEditSessionProvider, useRuleEditSession } from "@/components/spec/rule-edit-session";
import { Picker } from "@/components/spec/spec-rule-editor";
import { ADMIN_SPEC_RULE_EDIT_COPY as EDIT, ADMIN_SPEC_RULE_EDIT_COPY as EDIT_FOLD } from "@/lib/copy/spec";
import { describeEdit, editKey, mapEdit } from "@/lib/spec/rule-edits";
import {
  loadMapCompatible,
  loadMapRecord,
} from "@/app/(admin)/spec/map/actions";
import { ADMIN_SPEC_MAP_COPY as COPY } from "@/lib/copy/spec";

/**
 * The Spec Map (PROD-2960): one of the Catalog's three streams at a time, one column per level.
 * Each header names the relation into its column; a selected card's related cards are grouped under
 * what they hang off, and hovering a card lights up its own links. No arrows between cards
 * (Richard, 2026-10-14) — they only repeated the grouping.
 *
 * Eric, 2026-10-09:
 *   · colour means status (green active, yellow active internal, red not active); levels are told
 *     apart by an icon on the header;
 *   · no zoom or pan — a plain scrolling area, columns sized to fill its width;
 *   · selecting a card slides it and its related cards into a compact group at the top
 *     and fades everything else out; the record slides in from the right.
 *
 * Laid out here from fixed card heights — no measuring, no layout library: each column is ordered by
 * its parents' positions.
 */

const CARD_H = 48;
const ROW_H = 56;
/** Headers: the relation into the column ("Lines has →"), then its name and count. */
const HEAD_H = 60;
/**
 * The gap between columns: narrow, since no arrows run between cards (Richard, 2026-10-14) — the
 * relations are named once, on the headers; a card's own links light up on hover. Columns share the
 * map's width — the map never scrolls sideways.
 */
const GUTTER = 24;
const MIN_GUTTER = 16;
/** A card narrower than this squeezes the side panel first (down to MIN_PANEL_W). */
const MIN_CARD_W = 150;
const MIN_PANEL_W = 320;
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
/** The option ↔ option column of an option's edit layout: not a catalog level, laid out like one. */
const COMPATIBLE = "compatible" as TableKey;
/** While editing rules the right side is the edit panel (pending changes, impact, buttons) — 2026-10-14. */
const EDIT_PANEL_W = 400;
/** Wide enough for long option names; the edit layout has two columns, which would otherwise be huge. */
const EDIT_MAX_COL_W = 440;

const MOVE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/**
 * Every level starts open (Richard, 2026-10-14). Property values used to start folded — many-to-many
 * and large, when the resting map drew every arrow; resting columns now scroll on their own, unarrowed.
 */
const COLLAPSED_AT_START: TableKey[] = [];
const ALL = "all";
/**
 * A focused standard product's offered options, by how the product gets them (as Studio's product
 * view shows them): listed by the product itself, derived by the rules, added by an exception.
 * Told apart by line style, since colour means status.
 */
const OFFER_ORDER: OfferKind[] = ["listed", "derived", "added", "removed"];
const OFFER_DASH: Record<OfferKind, string | undefined> = {
  removed: "1 4",
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
  state: OfferKind;
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
  types: GroupLabel[];
  rails: { state: OfferKind; y1: number; ticks: number[] }[];
};
/** A group heading: in edit mode it folds (2026-10-14); folded, it says how many cards and whether one changed. */
type GroupLabel = { key: string; title: string; y: number; count?: number; folded?: boolean; changed?: boolean };

/**
 * One icon per depth, the same in every stream (Eric, 2026-10-09), high to low: a group of groups,
 * a group, one record, an attribute of records. One record is a box, not a square: a square read as
 * a checkbox next to the edit controls (Richard, 2026-10-14).
 */
const DEPTH_ICON: LucideIcon[] = [Layers3, Layers2, Box, Tag];
const iconOf = (level: TableKey) =>
  DEPTH_ICON[LEVEL_INFO.get(level)?.index ?? 0] ?? Box;

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

/** A focused column's group: the cards under one parent from an earlier column (2026-10-14). */
type FocusGroup = GroupLabel & { level: TableKey; x: number; parent: number | null; cards: number[] };
type Grouped = { heads: FocusGroup[]; headOf: Map<number, FocusGroup> };

/**
 * The focused view's columns, grouped (Richard, 2026-10-14). After the first, each column groups its
 * cards under their parent in the nearest earlier column — products under their style, values under
 * their property, inspiration products under the solution style whose filter takes them. Groups keep
 * their parent's order; cards are A→Z inside one; a folded group keeps its heading only. `skip` are
 * columns with a layout of their own (a focused product's offered options and properties).
 */
function regroup(
  f: Placed,
  levels: TableKey[],
  parentsOf: number[][],
  nodes: MapNode[],
  colW: number,
  folded: Set<string>,
  skip: TableKey[],
  other: string,
): Grouped {
  const heads: FocusGroup[] = [];
  const headOf = new Map<number, FocusGroup>();
  const colOf = new Map<number, number>();
  for (const [i, p] of f.pos) colOf.set(i, Math.round((p.x - PAD) / colW));
  const byTitle = (a: number, b: number) => nodes[a]!.title.localeCompare(nodes[b]!.title);
  let height = HEAD_H + ROW_H;
  levels.forEach((level, li) => {
    const cards = [...colOf].filter(([, c]) => c === li).map(([i]) => i);
    if (!cards.length) return;
    if (skip.includes(level)) {
      for (const i of cards) height = Math.max(height, f.pos.get(i)!.y + ROW_H);
      return;
    }
    const x = PAD + li * colW;
    if (li === 0) {
      cards.sort(byTitle).forEach((i, k) => f.pos.set(i, { x, y: HEAD_H + k * ROW_H }));
      height = Math.max(height, HEAD_H + cards.length * ROW_H);
      return;
    }
    // A card's group: its parent in the nearest earlier column.
    const primary = (i: number) => {
      let best: number | null = null;
      let bestCol = -1;
      for (const p of parentsOf[i] ?? []) {
        const c = colOf.get(p);
        if (c !== undefined && c < li && c > bestCol) {
          best = p;
          bestCol = c;
        }
      }
      return best;
    };
    // Group only a column whose cards mostly have ONE parent there: a shared card (a property stated by
    // twenty products) filed under one of them would misstate the rest — it stays a plain list.
    const nearest = Math.max(-1, ...cards.flatMap((i) => (parentsOf[i] ?? []).map((p) => colOf.get(p) ?? -1).filter((c) => c < li)));
    const shared = cards.filter((i) => (parentsOf[i] ?? []).filter((p) => colOf.get(p) === nearest).length > 1).length;
    if (nearest < 0 || shared * 3 > cards.length) {
      cards.sort(byTitle).forEach((i, k) => f.pos.set(i, { x, y: HEAD_H + k * ROW_H }));
      height = Math.max(height, HEAD_H + cards.length * ROW_H);
      return;
    }
    const byParent = new Map<number | null, number[]>();
    for (const i of cards) {
      const p = primary(i);
      byParent.set(p, [...(byParent.get(p) ?? []), i]);
    }
    const order = [...byParent.keys()].sort((a, b) =>
      a === null ? 1 : b === null ? -1 : f.pos.get(a)!.y - f.pos.get(b)!.y || byTitle(a, b),
    );
    let y = HEAD_H;
    for (const parent of order) {
      const list = byParent.get(parent)!.sort(byTitle);
      const key = `${level}:${parent ?? "none"}`;
      const isFolded = folded.has(key);
      const head: FocusGroup = { key, level, x, parent, cards: list, y, title: parent === null ? other : nodes[parent]!.title, count: list.length, folded: isFolded };
      heads.push(head);
      y += TYPE_H;
      for (const i of list) {
        headOf.set(i, head);
        if (isFolded) f.pos.delete(i);
        else {
          f.pos.set(i, { x, y });
          y += ROW_H;
        }
      }
    }
    height = Math.max(height, y);
  });
  f.height = height;
  return { heads, headOf };
}

const LEVEL_INFO = new Map<TableKey, { stream: string; label: string; index: number }>([
  ...TABLE_GROUPS.flatMap((g) =>
    g.levels.map(
      (l, i) => [l.key, { stream: g.key, label: l.label, index: i }] as const,
    ),
  ),
  // The map's own Properties column, between standard products and their values (2026-10-14).
  [MAP_PROPERTY, { stream: "products", label: "Product properties", index: 3 }],
  [MAP_OPTION_PROPERTY, { stream: "customizations", label: "Option properties", index: 3 }],
]);
/** The map's Properties columns: shared cards the related-cards walk stops at. */
const isPropertyLevel = (level: TableKey) => level === MAP_PROPERTY || level === MAP_OPTION_PROPERTY;
/**
 * Shorter column names on the map: inside the Products tab the "Product" prefix only repeats the
 * tab, and in narrow columns it pushed the names into "…" (Richard, 2026-10-09). The full name stays
 * in the header's tooltip, and the Catalog and the panel keep theirs.
 */
const MAP_LABEL: Partial<Record<TableKey, string>> = {
  productLine: "Lines",
  productStyle: "Styles",
  product: "Standard",
  [MAP_PROPERTY]: "Properties",
  [MAP_OPTION_PROPERTY]: "Properties",
  optionValue: "Property values",
  productValue: "Property values",
};
/** A stream's map columns: the Catalog's levels, plus Properties before a product's values. */
const mapLevelsOf = (keys: TableKey[]) =>
  keys.flatMap((k) => (k === "productValue" ? [MAP_PROPERTY, k] : k === "optionValue" ? [MAP_OPTION_PROPERTY, k] : [k]));
/** One record of a level, for the headers' relations ("Line has →"). */
const MAP_ENTITY: Partial<Record<TableKey, string>> = {
  productLine: "Line",
  productStyle: "Style",
  product: "Product",
  inspiration: "Inspiration product",
  [MAP_PROPERTY]: "Property",
  [MAP_OPTION_PROPERTY]: "Property",
  customizationCategory: "Category",
  customizationType: "Type",
  customizationOption: "Option",
  solution: "Solution",
  solutionStyle: "Solution style",
};
const mapLabelOf = (level: TableKey) =>
  MAP_LABEL[level] ?? LEVEL_INFO.get(level)?.label;
/**
 * Each column's relation into it, named once on its header — the ER diagram's line, "Lines has →"
 * over Styles (Richard, 2026-10-14). Which card relates to which shows by grouping and on hover; no
 * arrows run between cards.
 */
const HEAD_RELATION: Partial<Record<TableKey, { from: TableKey; verb: keyof typeof COPY.verb }>> = {
  productStyle: { from: "productLine", verb: "has" },
  product: { from: "productStyle", verb: "has" },
  [MAP_PROPERTY]: { from: "product", verb: "states" },
  productValue: { from: MAP_PROPERTY, verb: "has" },
  customizationType: { from: "customizationCategory", verb: "has" },
  customizationOption: { from: "customizationType", verb: "has" },
  [MAP_OPTION_PROPERTY]: { from: "customizationType", verb: "declares" },
  optionValue: { from: "customizationOption", verb: "lists" },
  solutionStyle: { from: "solution", verb: "has" },
  inspiration: { from: "solutionStyle", verb: "matches" },
};
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

/**
 * The Spec Map and its panel share one set of rule edits (PROD-2962): what is edited in the panel is
 * previewed on the diagram, and the diagram's own edits (× on an offered card, "Offer another…")
 * appear in the panel, before anything is saved.
 */
export function SpecMap({ data }: { data: SpecMapData }) {
  return (
    <RuleEditSessionProvider>
      <SpecMapView data={data} />
    </RuleEditSessionProvider>
  );
}

function SpecMapView({ data }: { data: SpecMapData }) {
  const session = useRuleEditSession()!;
  // `stated` is new (2026-10-14): a map cached before it has none.
  const { nodes, edges, links, stated = [] } = data;
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
  /** The map box's own border and vertical scrollbar, which its columns must leave room for. */
  const [areaChrome, setAreaChrome] = useState(0);
  /** The map box's inner height, and the row's height: the screen below the controls (2026-10-14). */
  const [areaH, setAreaH] = useState(600);
  const [boxH, setBoxH] = useState<number | null>(null);
  /** The resting columns' own scroll lists, by level. */
  const colRefs = useRef(new Map<TableKey, HTMLDivElement>());

  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () => {
      setRowW(el.clientWidth);
      if (area.current) {
        setAreaChrome(area.current.offsetWidth - area.current.clientWidth);
        setAreaH(area.current.clientHeight);
      }
    };
    // The map fills the screen below the controls (measured with the page at the top), at least 28rem.
    const fit = () => setBoxH(Math.max(448, Math.floor(window.innerHeight - (el.getBoundingClientRect().top + window.scrollY) - 16)));
    measure();
    fit();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (area.current) ro.observe(area.current);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  const parentsOf = useMemo(
    () => adjacency(nodes.length, edges, 1, 0),
    [nodes.length, edges],
  );
  const childrenOf = useMemo(
    () => adjacency(nodes.length, edges, 0, 1),
    [nodes.length, edges],
  );
  /** Product ↔ the values it states, both ways (the walk stops at the shared property cards). */
  const statedOf = useMemo(() => {
    const m = new Map<number, number[]>();
    for (const [a, b] of stated) {
      m.set(a, [...(m.get(a) ?? []), b]);
      m.set(b, [...(m.get(b) ?? []), a]);
    }
    return m;
  }, [stated]);
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
  /** For an inspiration product in focus: the product its offers come from, and its pre-selections. */
  const [preset, setPreset] = useState<{ base: { id: string; title: string }; preselected: Set<number> } | null>(null);
  /**
   * A focused product's derived options → the offered options that make them available (the rules'
   * `derivedBecause`). The product does not decide a derived option, so no arrow runs from it; hovering
   * a derived card (or its partner) draws the arcs instead (2026-10-14).
   */
  const [derivedFrom, setDerivedFrom] = useState<Map<number, number[]>>(new Map());
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => setHovered(null), [selected]);
  /** A partner option → the derived options it makes available. */
  const partnersOf = useMemo(() => {
    const m = new Map<number, number[]>();
    for (const [d, ps] of derivedFrom) for (const p of ps) m.set(p, [...(m.get(p) ?? []), d]);
    return m;
  }, [derivedFrom]);
  /** Folded group headings in the edit layouts and the focused view, cleared with the selection. */
  const [folded, setFolded] = useState<Set<string>>(new Set());
  useEffect(() => setFolded(new Set()), [selected]);
  const toggleFold = (key: string) => setFolded((f) => {
    const x = new Set(f);
    if (x.has(key)) x.delete(key);
    else x.add(key);
    return x;
  });
  /** The option edit layout's column filters ("compatible" / "product"), cleared with the selection. */
  const [colQ, setColQ] = useState<Record<string, string>>({});
  useEffect(() => setColQ({}), [selected]);
  /** For an option in focus: the options it is compatible with (rules today). */
  const [compatOptions, setCompatOptions] = useState<Set<number>>(new Set());
  /** This record's offers have arrived (edit controls wait for them). */
  const [compatLoaded, setCompatLoaded] = useState(false);
  /** The focused product's exceptions, per option card (from the rules view). */
  const [exceptions, setExceptions] = useState<Map<number, { mode: "add" | "remove"; reason?: string }>>(new Map());
  const [offers, setOffers] = useState<Map<number, OfferKind>>(
    new Map(),
  );
  /** Kept from product to product, so the same question can be asked of the next one. */
  const [offerKinds, setOfferKinds] = useState<Set<OfferKind>>(
    () => new Set(OFFER_ORDER),
  );
  const [openGroups, setOpenGroups] = useState<Set<OfferKind>>(
    () => new Set<OfferKind>(["listed"]),
  );
  const [offerQ, setOfferQ] = useState("");
  const [record, setRecord] = useState<{
    for: number;
    res: Awaited<ReturnType<typeof loadMapRecord>>;
  } | null>(null);
  const [, startLoading] = useTransition();

  // ── rule edits: the focused record after the session's edits, drawn as a preview ──
  const { addNames, setFocus, markFresh } = session;
  useEffect(() => {
    addNames(Object.fromEntries(nodes.map((n) => [n.id, n.title])));
  }, [nodes, addNames]);
  const indexOf = useMemo(() => new Map(nodes.map((n, i) => [`${n.level}:${n.id}`, i])), [nodes]);
  useEffect(() => {
    const n = selected !== null ? nodes[selected]! : null;
    setFocus(n && (n.level === "product" || n.level === "customizationOption") ? { level: n.level, id: n.id } : null);
  }, [selected, nodes, setFocus]);
  const after = useMemo(() => {
    const f = session.preview?.focus;
    const n = selected !== null ? nodes[selected]! : null;
    if (!f || !n || f.id !== n.id || !session.edits.length) return null;
    if (f.level === "product") {
      return {
        offers: new Map(f.options.flatMap((o) => { const i = indexOf.get(`customizationOption:${o.id}`); return i === undefined ? [] : [[i, o.state] as const]; })),
        exceptions: new Map(f.exceptions.flatMap((e) => { const i = indexOf.get(`customizationOption:${e.optionId}`); return i === undefined ? [] : [[i, { mode: e.mode, reason: e.reason }] as const]; })),
        products: null,
      };
    }
    return {
      offers: null, exceptions: null,
      products: new Set(f.products.flatMap((id) => { const i = indexOf.get(`product:${id}`); return i === undefined ? [] : [i]; })),
      compatOptions: new Set(f.compatible.flatMap((id) => { const i = indexOf.get(`customizationOption:${id}`); return i === undefined ? [] : [i]; })),
    };
  }, [session.preview, session.edits.length, selected, nodes, indexOf]);
  /** Per card: what the edits do to it — gained, lost, or offered another way. */
  const diff = useMemo(() => {
    const d = new Map<number, { kind: "gain" | "lose" | "change"; was?: OfferKind }>();
    if (after?.offers) {
      // "removed" is on the map but not offered: going to or from it is a loss or a gain.
      const on = (k?: OfferKind) => k !== undefined && k !== "removed";
      for (const i of new Set([...offers.keys(), ...after.offers.keys()])) {
        const was = offers.get(i);
        const now = after.offers.get(i);
        if (on(was) && !on(now)) d.set(i, { kind: "lose" });
        else if (!on(was) && on(now)) d.set(i, { kind: "gain" });
        else if (on(was) && was !== now) d.set(i, { kind: "change", was });
      }
    }
    if (after && "compatOptions" in after && after.compatOptions) {
      for (const i of after.compatOptions) if (!compatOptions.has(i)) d.set(i, { kind: "gain" });
      for (const i of compatOptions) if (!after.compatOptions.has(i)) d.set(i, { kind: "lose" });
    }
    if (after?.products) {
      for (const i of after.products) if (!compatible.has(i)) d.set(i, { kind: "gain" });
      for (const i of compatible) if (!after.products.has(i) && nodes[i]!.level === "product") d.set(i, { kind: "lose" });
    }
    return d;
  }, [after, offers, compatible, compatOptions, nodes]);
  /** Drawn offers: today's, with the edits' gains added and their kind changes applied; losses stay, marked. */
  const shownOffers = useMemo(() => {
    if (!after?.offers) return offers;
    const m = new Map(offers);
    for (const [i, st] of after.offers) m.set(i, st);
    return m;
  }, [offers, after]);
  /** Cards a pending edit names or changes — a folded group holding one is flagged. */
  const touched = useMemo(() => {
    const ids = session.edits.flatMap((e) =>
      e.kind === "pair" ? [e.a, e.b] : e.kind === "offer" || e.kind === "exception" ? [e.productId, e.optionId] : []);
    const out = new Set<number>(diff.keys());
    for (const id of ids) {
      for (const lv of ["customizationOption", "product"]) {
        const i = indexOf.get(`${lv}:${id}`);
        if (i !== undefined) out.add(i);
      }
    }
    return out;
  }, [session.edits, diff, indexOf]);
  /** An option's compatible options as drawn: today's, plus the edits' gains; losses stay, marked. */
  const compatOptionsShown = useMemo(() => {
    const extra = after && "compatOptions" in after && after.compatOptions ? [...after.compatOptions] : [];
    return extra.length ? new Set([...compatOptions, ...extra]) : compatOptions;
  }, [compatOptions, after]);
  /** Exceptions as drawn: with the pending edits applied while previewing. */
  const shownExceptions = after?.exceptions ?? exceptions;
  /** The pending edits that name a card's product–option pair (shown even when they change no offer). */
  const pendingOn = useCallback((i: number) => {
    if (selected === null) return [];
    const sel0 = nodes[selected]!;
    const n = nodes[i]!;
    const pair = sel0.level === "product" && n.level === "customizationOption" ? [sel0.id, n.id]
      : sel0.level === "customizationOption" && n.level === "product" ? [n.id, sel0.id] : null;
    if (sel0.level === "customizationOption" && n.level === "customizationOption") {
      return session.edits.filter((e) => e.kind === "pair" && ((e.a === sel0.id && e.b === n.id) || (e.a === n.id && e.b === sel0.id)));
    }
    if (!pair) return [];
    return session.edits.filter((e) => (e.kind === "offer" || e.kind === "exception") && e.productId === pair[0] && e.optionId === pair[1]);
  }, [selected, nodes, session.edits]);
  const compatibleShown = useMemo(() => {
    const extra = after?.offers ? [...after.offers.keys()] : after?.products ? [...after.products] : [];
    if (!extra.length) return compatible;
    return new Set([...compatible, ...extra]);
  }, [compatible, after]);

  /** Everything connected to the selection; cross-stream records come with their own parents, for context. */
  const related = useMemo(() => {
    if (selected === null) return null;
    const out = new Set<number>([selected]);
    // A property is shared by many products: walking through it would relate a product to every value
    // of its properties (and a value to every product with that property). Unless a property is the
    // selection, the walk stops there, and a product reaches its own values through `stated`.
    const viaProperty = isPropertyLevel(nodes[selected]!.level);
    const walk = (from: number, next: number[][]) => {
      const stack = [from];
      while (stack.length) {
        for (const n of next[stack.pop()!] ?? []) {
          if (out.has(n)) continue;
          out.add(n);
          if (viaProperty || !isPropertyLevel(nodes[n]!.level)) stack.push(n);
        }
      }
    };
    walk(selected, parentsOf);
    const beforeDown = new Set(out);
    walk(selected, childrenOf);
    const below = [...out].filter((i) => !beforeDown.has(i));
    for (const other of statedOf.get(selected) ?? []) {
      out.add(other);
      walk(other, parentsOf);
    }
    // Below the selection, the products in view bring their own values (a line → its products' values).
    if (!viaProperty) for (const r of below) if (nodes[r]!.level === "product") for (const v of statedOf.get(r) ?? []) out.add(v);
    // Context one step up from the values in view: their properties (a focused option's properties are
    // its type's declaration, not an arrow of its own) — and, for a selected property, the records
    // that list those values (2026-10-14).
    for (const v of [...out]) {
      const lv = nodes[v]!.level;
      if (lv !== "productValue" && lv !== "optionValue") continue;
      for (const p of parentsOf[v] ?? []) {
        if (isPropertyLevel(nodes[p]!.level)) out.add(p);
        else if (viaProperty && !out.has(p)) {
          out.add(p);
          walk(p, parentsOf);
        }
      }
    }
    for (const other of [...(linksOf.get(selected) ?? []), ...compatibleShown]) {
      out.add(other);
      walk(other, parentsOf);
    }
    return out;
  }, [selected, parentsOf, childrenOf, linksOf, compatibleShown, statedOf, nodes]);

  useEffect(() => {
    if (selected === null) return;
    const n = nodes[selected]!;
    setCompatible(new Set());
    setOffers(new Map());
    setExceptions(new Map());
    setCompatLoaded(false);
    setPreset(null);
    setCompatOptions(new Set());
    setDerivedFrom(new Map());
    setOfferQ("");
    if (isPropertyLevel(n.level)) {
      // No Catalog record or rules for a property: the panel says what the card is.
      setRecord({ for: selected, res: { ok: true, data: null } });
      setCompatLoaded(true);
      return;
    }
    startLoading(async () => {
      const [rec, compat] = await Promise.all([
        loadMapRecord(n.level, n.id),
        loadMapCompatible(n.level, n.id),
      ]);
      setRecord({ for: selected, res: rec });
      setCompatLoaded(true);
      markFresh();
      if (compat.ok) {
        const want = new Map<string, OfferKind | null>([
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
        setDerivedFrom(new Map(Object.entries(compat.data.derivedFrom ?? {}).flatMap(([o, ps]) => {
          const i = indexOf.get(`customizationOption:${o}`);
          return i === undefined ? [] : [[i, ps.flatMap((p) => { const j = indexOf.get(`customizationOption:${p}`); return j === undefined ? [] : [j]; })] as const];
        })));
        setCompatOptions(new Set((compat.data.compatibleOptions ?? []).flatMap((o) => { const i = indexOf.get(`customizationOption:${o}`); return i === undefined ? [] : [i]; })));
        setPreset(compat.data.base ? {
          base: compat.data.base,
          preselected: new Set((compat.data.preselected ?? []).flatMap((o) => { const i = indexOf.get(`customizationOption:${o}`); return i === undefined ? [] : [i]; })),
        } : null);
        setExceptions(new Map(compat.data.exceptions.flatMap((e) => {
          const i = indexOf.get(`customizationOption:${e.optionId}`);
          return i === undefined ? [] : [[i, { mode: e.mode, reason: e.reason }] as const];
        })));
        setOffers(
          new Map(
            found.flatMap(([i, state]) => (state ? [[i, state] as const] : [])),
          ),
        );
      }
    });
  }, [selected, nodes, session.version, indexOf, markFresh]);

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
  const selLevel = selected !== null ? nodes[selected]!.level : null;
  /**
   * Edit layout (2026-10-14): with Edit rules on and a product or an option in focus, the map shows only
   * what rules connect — the record and its offered options (or the products offering it). Lines, styles
   * and property values become a breadcrumb; the details panel folds to a rail.
   */
  const editLayout = focusing && session.editing && (selLevel === "product" || selLevel === "customizationOption");


  // ── layout: the current stream; the resting layout, and the focused one when a card is selected ──
  const group = TABLE_GROUPS.find((g) => g.key === stream) ?? TABLE_GROUPS[0]!;
  /**
   * A focused standard product brings the options it offers into its own stream, as a column right
   * after it. Known from the selection alone, so the columns are settled before the cards glide; the
   * options rise in once the rules answer.
   */
  // A standard product — or an inspiration product, which shows its base's offers (2026-10-14).
  const offering =
    focusing &&
    (nodes[selected!]!.level === "product" || nodes[selected!]!.level === "inspiration") &&
    stream === streamOf(nodes[selected!]!.level);
  /**
   * A focused standard product (Richard, 2026-10-14): three wide columns — the product, what it offers,
   * and what it states, each value under its property — so names fit; its line and style become the
   * breadcrumb (with one product in focus they are a chain of one card each).
   */
  const productFocus = offering && nodes[selected!]!.level === "product";
  const levels = useMemo(() => {
    if (editLayout) {
      // An option's two relations side by side: compatible options (option ↔ option) and the products offering it.
      return selLevel === "product" ? (["product", "customizationOption"] as TableKey[]) : (["customizationOption", COMPATIBLE, "product"] as TableKey[]);
    }
    const own = mapLevelsOf(group.levels.map((l) => l.key))

    if (!offering) return own;
    if (productFocus) return ["product", "customizationOption", MAP_PROPERTY] as TableKey[];
    const at = own.indexOf("inspiration") + 1;
    return [...own.slice(0, at), "customizationOption" as TableKey, ...own.slice(at)];
  }, [group, offering, productFocus, editLayout, selLevel]);
  /**
   * The panel's width, so the map's columns for the new selection are known in the same render. It
   * gives way (to MIN_PANEL_W) before the cards get narrower than MIN_CARD_W.
   */
  const wantPanelW =
    selected === null ? 0 : editLayout ? Math.min(EDIT_PANEL_W, Math.floor(rowW * 0.4)) : Math.min(PANEL_W, Math.floor(rowW * 0.45));
  const mapNeeds = PAD * 2 + levels.length * (MIN_CARD_W + MIN_GUTTER) + areaChrome;
  const panelW = wantPanelW
    ? Math.max(Math.min(wantPanelW, MIN_PANEL_W), Math.min(wantPanelW, rowW - PANEL_GAP - mapNeeds))
    : 0;
  const areaW = rowW - (panelW ? panelW + PANEL_GAP : 0) - areaChrome;
  // Every column shares the width: the diagram fits its box and scrolls only down.
  const colW = Math.min(
    editLayout ? EDIT_MAX_COL_W : Number.POSITIVE_INFINITY,
    Math.max(1, Math.floor((areaW - PAD * 2) / levels.length)),
  );
  const gutter = Math.max(MIN_GUTTER, Math.min(GUTTER, Math.round(colW * 0.22)));
  const cardW = colW - gutter;
  /** Headers run on into the gutter (nothing is drawn there at their height), so names fit narrow columns. */
  const headW = colW - 8;
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
        editLayout
          ? level === COMPATIBLE
            ? [...compatOptionsShown].filter(statusOk).sort((a, b) => {
                const ta = nodes[parentsOf[a]?.[0] ?? a]!.title;
                const tb = nodes[parentsOf[b]?.[0] ?? b]!.title;
                return ta.localeCompare(tb) || nodes[a]!.title.localeCompare(nodes[b]!.title);
              })
            : level === selLevel
            ? [selected!]
            : selLevel === "customizationOption" && level === "product"
              ? [...compatibleShown].filter((i) => nodes[i]!.level === "product" && statusOk(i))
              : []
          : streamOf(level) !== stream
            ? []
            : (byLevel.get(level) ?? []).filter(
                (i) => related!.has(i) && statusOk(i),
              ),
      parentsOf,
      colW,
    );
    const grouped = editLayout
      ? null
      : regroup(f, levels, parentsOf, nodes, colW, folded, offering ? ["customizationOption" as TableKey, ...(productFocus ? [MAP_PROPERTY] : [])] : [], COPY.otherGroup);
    // A focused product's properties, A→Z, each with the values the product states under it.
    const propRails: { y1: number; ticks: number[] }[] = [];
    let propBottom = 0;
    if (productFocus) {
      const x = PAD + levels.indexOf(MAP_PROPERTY) * colW;
      const byTitle = (a: number, b: number) => nodes[a]!.title.localeCompare(nodes[b]!.title);
      const props = [...f.pos.keys()].filter((i) => nodes[i]!.level === MAP_PROPERTY).sort(byTitle);
      let y = HEAD_H;
      for (const p of props) {
        f.pos.set(p, { x, y });
        const y1 = y + CARD_H;
        y += ROW_H;
        const ticks: number[] = [];
        for (const v of (childrenOf[p] ?? []).filter((v) => related!.has(v) && statusOk(v)).sort(byTitle)) {
          f.pos.set(v, { x: x + INDENT, y });
          ticks.push(y + CARD_H / 2);
          y += ROW_H;
        }
        if (ticks.length) propRails.push({ y1, ticks });
      }
      propBottom = y;
    }
    if (editLayout && selLevel === "customizationOption") {
      // An option's two columns, laid out by hand: a filter, then cards under group headings — compatible
      // options by type, products by line (2026-10-14).
      const titleOf = (i: number | undefined) => (i === undefined ? "" : nodes[i]!.title);
      const cols = [
        {
          key: "compatible", level: COMPATIBLE,
          items: [...compatOptionsShown].filter(statusOk),
          groupOf: (i: number) => titleOf(parentsOf[i]?.[0]),
          placeholder: EDIT.filterCompatible,
        },
        {
          key: "product", level: "product" as TableKey,
          items: [...compatibleShown].filter((i) => nodes[i]!.level === "product" && statusOk(i)),
          groupOf: (i: number) => {
            const style = parentsOf[i]?.[0];
            const line = style === undefined ? undefined : parentsOf[style]?.[0];
            return titleOf(line ?? style);
          },
          placeholder: EDIT.filterProducts,
        },
      ];
      let height = f.height;
      const editCols = cols.map((c) => {
        const x = PAD + levels.indexOf(c.level) * colW;
        const needle = (colQ[c.key] ?? "").trim().toLowerCase();
        const hit = (i: number) => !needle || nodes[i]!.title.toLowerCase().includes(needle)
          || (nodes[i]!.code ?? "").toLowerCase().includes(needle) || c.groupOf(i).toLowerCase().includes(needle);
        for (const i of c.items) f.pos.delete(i);
        const groups = new Map<string, number[]>();
        for (const i of c.items.filter(hit)) groups.set(c.groupOf(i), [...(groups.get(c.groupOf(i)) ?? []), i]);
        const labels: GroupLabel[] = [];
        let y = HEAD_H + FILTER_H;
        for (const [g, cards] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
          const groupKey = `${c.key}:${g}`;
          const isFolded = !needle && folded.has(groupKey);
          labels.push({ key: groupKey, title: g || EDIT.noGroup, y, count: cards.length, folded: isFolded, changed: cards.some((i) => touched.has(i)) });
          y += TYPE_H;
          if (isFolded) continue;
          for (const i of cards.sort((a, b) => nodes[a]!.title.localeCompare(nodes[b]!.title))) {
            f.pos.set(i, { x, y });
            y += ROW_H;
          }
        }
        height = Math.max(height, y);
        return { key: c.key, x, filterY: HEAD_H, labels, placeholder: c.placeholder, shown: [...groups.values()].flat().length, total: c.items.length };
      });
      return { ...f, height, offer: null, editCols, grouped, propRails };
    }
    if (!offering) return { ...f, offer: null, editCols: null, grouped, propRails };

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
      const all = [...shownOffers]
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
        const typeKey = `${state}:${t}`;
        const isFolded = editLayout && !needle && folded.has(typeKey);
        offer.types.push({
          key: typeKey,
          title: t >= 0 ? nodes[t]!.title : COPY.otherType,
          y,
          count: cards.length,
          folded: isFolded,
          changed: cards.some((i) => touched.has(i)),
        });
        y += TYPE_H;
        if (isFolded) continue;
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
    return { ...f, height: Math.max(f.height, y, propBottom), offer, editCols: null, grouped, propRails };
  }, [
    focusing,
    offering,
    productFocus,
    childrenOf,
    shownOffers,
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
    editLayout,
    selLevel,
    compatibleShown,
    compatOptionsShown,
    colQ,
    folded,
    touched,
  ]);

  const targetOf = (i: number) =>
    focus ? (focus.pos.get(i) ?? rest.pos.get(i)) : rest.pos.get(i);

  /**
   * At rest (nothing selected) each column is its own list, as tall as the screen, scrolled on its own,
   * A→Z (Richard, 2026-10-14). Selecting a card switches to the focused view.
   */
  const columnsMode = selected === null;
  const colPos = useMemo(() => {
    const m = new Map<number, Pos>();
    levels.forEach((level, li) => {
      if (streamOf(level) !== stream || collapsed.has(level)) return;
      (byLevel.get(level) ?? [])
        .filter((i) => rest.pos.has(i))
        .forEach((i, k) => m.set(i, { x: PAD + li * colW, y: HEAD_H + k * ROW_H }));
    });
    return m;
  }, [levels, stream, collapsed, byLevel, rest, colW]);
  /** Where a resting column's cards are on screen now (their list's scroll), for the glide into focus. */
  const lastColumns = useRef<{ on: boolean; pos: Map<number, Pos> }>({ on: true, pos: new Map() });
  useLayoutEffect(() => {
    lastColumns.current = { on: columnsMode, pos: colPos };
  });
  const columnsOnScreen = () => {
    const pos = new Map<number, Pos>();
    for (const [i, p] of lastColumns.current.pos) {
      const top = colRefs.current.get(nodes[i]!.level)?.scrollTop ?? 0;
      const y = p.y - top;
      // Cards scrolled out of their list have no place to glide from: they arrive instead.
      if (y >= HEAD_H - CARD_H && y <= HEAD_H + areaH) pos.set(i, { x: p.x, y });
    }
    return pos;
  };

  /*
   * Cards glide only when the selection changes — never on a resize, a filter or a collapse — and
   * they glide from where they were ON SCREEN (Eric, 2026-10-09): the map jumps to where the new
   * layout should be seen (the top when focusing, the record's place when clearing), each card is
   * first drawn where it appeared before the jump, then moves to its new place.
   */
  const focusKey = focusing ? `${selected}${editLayout ? ":edit" : ""}` : "rest";
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
    const before = lastColumns.current.on ? { pos: columnsOnScreen() } : shown.current;
    if (columnsMode && clearedFrom !== null) {
      // Back to the columns: the record just cleared is put back in view, in its own column.
      const at = colPos.get(clearedFrom);
      const list = colRefs.current.get(nodes[clearedFrom]!.level);
      if (at && list) list.scrollTop = Math.max(0, at.y - HEAD_H - list.clientHeight / 3);
    }
    const back = clearedFrom !== null && !columnsMode ? rest.pos.get(clearedFrom) : undefined;
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

  /**
   * Focused view (not the edit layout): each column scrolls on its own (Richard, 2026-10-14). The cards
   * stay on one canvas — so the hover lines can join them — and a column's scroll is an offset: its
   * cards, headings and rails move by it.
   */
  const virtualCols = focus !== null && !editLayout && !columnsMode;
  const [colScroll, setColScroll] = useState<{ key: string; by: Record<number, number> }>({ key: "", by: {} });
  const colOfX = (x: number) => Math.round((x - PAD) / colW);
  const offAt = (x: number) => (virtualCols && colScroll.key === focusKey ? (colScroll.by[colOfX(x)] ?? 0) : 0);
  const view = (p: Pos): Pos => ({ x: p.x, y: p.y - offAt(p.x) });
  /** Each focused column's content bottom, for its scroll range and its thumb. */
  const colBottom = useMemo(() => {
    const m = new Map<number, number>();
    if (!focus) return m;
    const col = (x: number) => Math.round((x - PAD) / colW);
    const up = (x: number, bottom: number) => m.set(col(x), Math.max(m.get(col(x)) ?? 0, bottom));
    for (const p of focus.pos.values()) up(p.x, p.y + ROW_H);
    for (const h of focus.grouped?.heads ?? []) up(h.x, h.y + TYPE_H + ROW_H);
    if (focus.offer) up(focus.offer.x, focus.height);
    return m;
  }, [focus, colW]);
  const maxScroll = (c: number) => Math.max(0, (colBottom.get(c) ?? 0) + PAD - areaH);
  const scrollCol = (c: number, to: number) =>
    setColScroll((s) => {
      const by = s.key === focusKey ? s.by : {};
      const v = Math.max(0, Math.min(maxScroll(c), to));
      return v === (by[c] ?? 0) ? s : { key: focusKey, by: { ...by, [c]: v } };
    });
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    if (!virtualCols || !area.current) return;
    const left = area.current.getBoundingClientRect().left;
    const c = colOfX(e.clientX - left - colW / 2 + PAD);
    if (maxScroll(c) <= 0) return;
    e.preventDefault();
    scrollCol(c, offAt(PAD + c * colW) + e.deltaY);
  };
  // Columns scroll on their own: the box itself stays at the top.
  useLayoutEffect(() => {
    if (virtualCols && area.current) area.current.scrollTop = 0;
  }, [virtualCols, focusKey]);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const h = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);
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

  /**
   * A tab while editing rules (2026-10-14): the edit layout already spans streams, so another tab means
   * "browse something else" — leave edit mode and show that tab's own map. With unsaved changes the
   * switch waits for an explicit choice; nothing is discarded silently.
   */
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const leaveEditTo = (tab: string) => {
    session.clear();
    clearSelection();
    setPendingTab(null);
    setStream(tab);
  };
  const changeTab = (tab: string) => {
    if (tab === stream) return;
    if (!session.editing) { setStream(tab); return; }
    if (session.edits.length) { setPendingTab(tab); return; }
    leaveEditTo(tab);
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
    for (const i of drawn) if (onMap(i) && !isGone(i)) pos.set(i, virtualCols ? view(posOf(i)!) : posOf(i)!);
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
  const onMap = (i: number) => inStream(i) || (offering && shownOffers.has(i)) || (editLayout && Boolean(focus?.pos.has(i)));
  const isGone = (i: number) =>
    from
      ? !from.pos.has(i)
      : focus !== null &&
        // In the edit layout the placed cards are the picture (an option's compatible options are not in
        // the structural "related" set).
        ((!editLayout && related !== null && !related.has(i)) || !focus.pos.has(i));
  /** Cards to draw: the resting ones, plus related cards from collapsed levels while focusing. */
  const drawn = useMemo(() => {
    const s = new Set(rest.pos.keys());
    if (focus) for (const i of focus.pos.keys()) s.add(i);
    return [...s];
  }, [rest, focus]);
  const grouped = focus?.grouped ?? null;
  /**
   * Hovering a card in focus (Richard, 2026-10-14): its own links light up — what it hangs off, what
   * hangs off it, the values a product states, a derived option's partners, an offer's product — and
   * the rest dims. Between neighbouring columns a thin line joins them while the pointer stays.
   */
  const hoverSet = useMemo(() => {
    if (hovered === null || !focus) return null;
    const s = new Set<number>([
      hovered,
      ...(parentsOf[hovered] ?? []),
      ...(childrenOf[hovered] ?? []),
      ...(statedOf.get(hovered) ?? []),
      ...(derivedFrom.get(hovered) ?? []),
      ...(partnersOf.get(hovered) ?? []),
    ]);
    if (offering && selected !== null) {
      if (shownOffers.has(hovered)) s.add(selected);
      if (hovered === selected) for (const i of shownOffers.keys()) s.add(i);
    }
    return s;
  }, [hovered, focus, parentsOf, childrenOf, statedOf, derivedFrom, partnersOf, offering, selected, shownOffers]);
  /** Laid out and settled: the offered-options column's own parts (filter, group headers, rails). */
  const offerUi =
    offering && focus?.offer && !from && focus.pos.has(selected!)
      ? focus.offer
      : null;
  /**
   * An offer group's heading on screen: in its place, or — open, and scrolled past — stuck under the
   * filter until the next heading pushes it up.
   */
  const offerHeadTop = (o: OfferLayout, k: number) => {
    const off = offAt(o.x);
    const g = o.groups[k]!;
    const natural = g.y - off;
    const stick = HEAD_H + FILTER_H;
    if (!virtualCols || !g.open || natural >= stick) return natural;
    const next = o.groups[k + 1];
    return Math.min(stick, next ? next.y - off - GROUP_GAP - GROUP_H : stick);
  };
  /** Options per kind (status filter applied), for the focus bar's chips. */
  const offerCount = (state: OfferKind) =>
    [...shownOffers].filter(([i, k]) => k === state && statusOk(i)).length;
  const toggleKind = (state: OfferKind) =>
    setOfferKinds((ks) => {
      // From "all": show only this kind. Otherwise toggle it; turning off the last one shows all again.
      if (ks.size === OFFER_ORDER.length) return new Set([state]);
      const x = new Set(ks);
      if (x.has(state)) x.delete(state);
      else x.add(state);
      return x.size ? x : new Set(OFFER_ORDER);
    });
  const sel = selected !== null ? nodes[selected]! : null;
  /** The record's ancestors, top first, then the record — the edit layout's breadcrumb. */
  const crumbIds = useMemo(() => {
    if (selected === null) return [];
    const out: number[] = [selected];
    let i = parentsOf[selected]?.[0];
    while (i !== undefined && out.length < 4) { out.unshift(i); i = parentsOf[i]?.[0]; }
    return out;
  }, [selected, parentsOf]);
  const crumbs = crumbIds.map((i) => nodes[i]!.title);

  // ── editing on the diagram: offer or stop offering an option on a product ──
  // Not on stale data: never while the map is re-reading the rules after a submit, or before this
  // record's offers have loaded (2026-10-14).
  const editingHere = session.editing && session.canEdit && !session.refreshing && compatLoaded && sel !== null && (sel.level === "product" || sel.level === "customizationOption");
  const [editNote, setEditNote] = useState<string | null>(null);
  /** A Map button: the explicit edit for what the card shows, or a refusal when the card is stale. */
  const act = (p: string, o: string, action: "stop" | "offerAgain", shown: OfferKind) => {
    if (!session.meta) return;
    const r = mapEdit(session.meta, p, o, action, shown);
    if (r.ok) { setEditNote(null); session.put(r.edit); return; }
    setEditNote(r.reason === "stale" ? EDIT.staleCard : EDIT.notStandard);
    if (r.reason === "stale") session.refresh();
  };
  const offerOn = (p: string, o: string, want: boolean, offeredNow: boolean) => {
    setEditNote(session.setOffered(p, o, want, offeredNow) ? null : EDIT.notStandard);
  };
  /** The product–option pair a card stands for while a product or an option is in focus. */
  const editTarget = (i: number) => {
    if (!editingHere || i === selected) return null;
    const n = nodes[i]!;
    const pair =
      sel!.level === "product" && n.level === "customizationOption" && offering && shownOffers.has(i)
        ? { p: sel!.id, o: n.id, offeredNow: offers.has(i) && offers.get(i) !== "removed" }
        : sel!.level === "customizationOption" && n.level === "product" && compatibleShown.has(i)
          ? { p: n.id, o: sel!.id, offeredNow: compatible.has(i) }
          : null;
    if (!pair) return null;
    const direct = session.edits.some((e) =>
      (e.kind === "offer" || e.kind === "exception") && e.productId === pair.p && e.optionId === pair.o);
    return { ...pair, direct };
  };
  /** What "offer another" can pick: options for a product, standard products for an option. */
  const addChoices = useMemo(() => {
    if (!editingHere || !sel) return [];
    if (sel.level === "product") {
      return nodes.flatMap((n, i) =>
        n.level === "customizationOption" && !(after?.offers ?? offers).has(i)
          ? [{
              id: n.id,
              title: n.title,
              group: [
                parentsOf[i]?.[0] !== undefined ? nodes[parentsOf[i]![0]!]!.title : "",
                session.meta?.decidedBy[session.meta.optionType[n.id] ?? ""] === "customization" ? EDIT.asException : "",
              ].filter(Boolean).join(" · "),
            }]
          : []);
    }
    const standard = new Set(session.meta?.standard ?? []);
    const offering = after?.products ?? compatible;
    return nodes.flatMap((n, i) =>
      n.level === "product" && standard.has(n.id) && !offering.has(i) ? [{ id: n.id, title: n.title, group: n.code ?? "" }] : []);
  }, [editingHere, sel, nodes, after, offers, compatible, parentsOf, session.meta]);
  const relatedIn = (level: TableKey) =>
    related ? [...related].filter((i) => nodes[i]!.level === level).length : 0;
  const elsewhere = TABLE_GROUPS.filter(
    (g) => g.key !== stream && (relatedByStream.get(g.key) ?? 0) > 0,
  );

  /** One card at a position — on the diagram, or inside a resting column's own scroll list. */
  const renderCard = (i: number, p: Pos) => {
              if (!onMap(i)) return null;
              const n = nodes[i]!;
              const offer = offering ? shownOffers.get(i) : undefined;
              const Icon = iconOf(n.level);
              const dot = statusDot(n.status);
              const unrelated = !editLayout && related !== null && !related.has(i);
              const faded = hoverSet !== null && !hoverSet.has(i);
              // Hung under a heading in its own column: an offered option, or a value under its property.
              const indented = Boolean(offer) || (productFocus && n.level === "productValue");
              const gone = isGone(i);
              // A related card from a collapsed level (property values) has no resting place: once the
              // others have moved it rises into its own column from below, row by row (Eric, 2026-10-09).
              // The rise is on an inner layer — an animation on the positioned element would override
              // its translate and start it from the map's top-left corner.
              const arriving = !from && focus !== null && !rest.pos.has(i);
              const change = diff.get(i);
              const pending = pendingOn(i);
              // A compatible option of the option being edited (the middle column).
              const compatCard = editingHere && sel?.level === "customizationOption" && n.level === "customizationOption" && i !== selected && compatOptionsShown.has(i);
              const exc = offer ? shownExceptions.get(i) : undefined;
              // An add exception on an option the rules already give (or a remove on one they do not)
              // changes nothing — the engine calls it redundant; the card stays where the rules put it.
              const noEffect = exc ? (exc.mode === "add" ? offer !== "added" : offer !== "removed") : false;
              const target = editTarget(i);
              const row = Math.max(0, Math.round((p.y - HEAD_H) / ROW_H));
              return (
                <div
                  key={i}
                  className={`absolute left-0 top-0 transition-opacity ${gone ? "pointer-events-none opacity-0" : unrelated ? "opacity-25" : faded ? "opacity-40" : "opacity-100"} ${i === selected ? "z-10" : ""}`}
                  style={{
                    width: indented ? cardW - INDENT : cardW,
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
                    onMouseEnter={focus && !from ? () => setHovered(i) : undefined}
                    onMouseLeave={focus && !from ? () => setHovered((h) => (h === i ? null : h)) : undefined}
                    title={[
                      n.title,
                      offer ? COPY.offerKind[offer] : null,
                      offer === "derived" && derivedFrom.get(i)?.length ? COPY.derivedWhy(derivedFrom.get(i)!.map((j) => nodes[j]!.title)) : null,
                      change?.kind === "gain" ? EDIT.previewGain : change?.kind === "lose" ? EDIT.previewLose : change?.was ? EDIT.previewChange(COPY.offerKind[change.was]) : null,
                      exc ? `${EDIT.exceptionChip(exc.mode)}${exc.reason ? `: ${exc.reason}` : ""}${noEffect ? ` — ${EDIT.noEffectWhy(exc.mode)}` : ""}` : null,
                      pending.length ? EDIT.pendingHere(pending.map((e) => describeEdit(e, session.names)).join("; ")) : null,
                      n.status,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                    tabIndex={gone ? -1 : undefined}
                    aria-hidden={gone ? true : undefined}
                    className={`flex size-full items-center gap-2 rounded-md border bg-card px-2.5 text-left shadow-xs hover:bg-muted ${
                      i === selected
                        ? "border-foreground ring-2 ring-foreground"
                        : change?.kind === "gain"
                          ? "border-green-600 ring-1 ring-green-600/50"
                          : change?.kind === "lose"
                            ? "border-dashed border-red-500 opacity-70"
                            : change?.kind === "change"
                              ? "border-amber-500 ring-1 ring-amber-500/50"
                              : compatibleShown.has(i)
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
                      <span className={`truncate text-xs font-medium text-foreground ${change?.kind === "lose" ? "line-through" : ""}`}>
                        {n.title}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {preset?.preselected.has(i) ? <span className="font-medium text-blue-700 dark:text-blue-400">{EDIT.preselected} · </span> : null}
                        {exc ? <span className={exc.mode === "add" ? "font-medium text-foreground" : "font-medium text-red-700 dark:text-red-400"}>{EDIT.exceptionChip(exc.mode)}{noEffect ? ` ${EDIT.noEffect}` : ""} · </span> : null}
                        {offer === "derived" && derivedFrom.get(i)?.length ? (
                          <span className="text-foreground/80">{COPY.via(derivedFrom.get(i)!.map((j) => nodes[j]!.title))} · </span>
                        ) : null}
                        {/* A value under its property heading: the property is not repeated. */}
                        {[n.code, productFocus && n.level === "productValue" ? null : n.sub].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    {dot ? (
                      <span
                        className={`size-2.5 shrink-0 rounded-full ${dot}`}
                        aria-label={n.status ?? undefined}
                      />
                    ) : null}
                  </button>
                  {pending.length && !change && !gone ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white"
                    >
                      ✎
                    </span>
                  ) : null}
                  {change && !gone ? (
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute -left-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${change.kind === "gain" ? "bg-green-600" : change.kind === "lose" ? "bg-red-500" : "bg-amber-500"}`}
                    >
                      {change.kind === "gain" ? "+" : change.kind === "lose" ? "−" : "~"}
                    </span>
                  ) : null}
                  {compatCard && !gone ? (
                    pending.length ? (
                      <CardAction icon={Undo2} label={EDIT.undoPending(n.title)} onClick={() => pending.forEach((e) => session.remove(editKey(e)))} />
                    ) : compatOptions.has(i) ? (
                      <CardAction icon={CircleMinus} tone="danger" label={EDIT.notCompatible(n.title)}
                        onClick={() => session.put({ kind: "pair", a: sel!.id, b: n.id, compatible: false })} />
                    ) : null
                  ) : null}
                  {target && !gone ? (
                    // One meaning per icon (2026-10-14): ↺ only undoes your own pending change; ⊖ stops
                    // offering; ⊕ offers again. Each makes exactly the edit its label says, or refuses.
                    target.direct ? (
                      <CardAction icon={Undo2} label={EDIT.undoPending(n.title)} onClick={() => session.setOffered(target.p, target.o, true, true)} />
                    ) : change ? null : sel!.level === "product" ? (
                      offers.get(i) === "removed" ? (
                        <CardAction icon={CirclePlus} label={EDIT.offerAgain(n.title)} onClick={() => act(target.p, target.o, "offerAgain", "removed")} />
                      ) : offers.has(i) ? (
                        <CardAction icon={CircleMinus} tone="danger" label={EDIT.stopOffering(n.title)} onClick={() => act(target.p, target.o, "stop", offers.get(i)!)} />
                      ) : null
                    ) : (
                      <CardAction icon={CircleMinus} tone="danger" label={EDIT.stopOffering(n.title)} onClick={() => offerOn(target.p, target.o, false, target.offeredNow)} />
                    )
                  ) : null}
                </div>
              );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <Tabs value={stream} onValueChange={changeTab}>
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

      {pendingTab ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <span className="text-amber-900 dark:text-amber-200">
            {EDIT.unsavedOnSwitch(session.edits.length, TABLE_GROUPS.find((g) => g.key === pendingTab)?.label ?? pendingTab)}
          </span>
          <Button size="xs" variant="destructive" onClick={() => leaveEditTo(pendingTab)}>{EDIT.discardAndSwitch}</Button>
          <Button size="xs" variant="ghost" onClick={() => setPendingTab(null)}>{EDIT.keepEditing}</Button>
        </div>
      ) : null}

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
            {editLayout ? (
              <span className="truncate text-muted-foreground" title={crumbs.join(" › ")}>
                {EDIT.editingIn} {crumbs.slice(0, -1).join(" › ")}{crumbs.length > 1 ? " › " : ""}
                <span className="font-medium text-foreground">{sel.title}</span>
              </span>
            ) : (
              <>
                <span className="shrink-0 text-muted-foreground">{COPY.focusedOn}</span>
                {/* A focused product's line and style: its breadcrumb, each a click away. */}
                {productFocus
                  ? crumbIds.slice(0, -1).map((i) => (
                      <span key={i} className="flex min-w-0 shrink items-center gap-3">
                        <button type="button" onClick={() => select(i, false)} className="truncate text-muted-foreground hover:text-foreground hover:underline">
                          {nodes[i]!.title}
                        </button>
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      </span>
                    ))
                  : null}
                <span className="truncate font-medium text-foreground">
                  {sel.title}
                </span>
              </>
            )}
            {offering && shownOffers.size ? (
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
            {preset && sel.level === "inspiration" ? (
              <Button size="xs" variant="outline" title={EDIT.presetBaseTitle(preset.base.title)} onClick={() => selectBy("product", preset.base.id)}>
                {EDIT.presetBase(preset.base.title, preset.preselected.size)}
              </Button>
            ) : null}
            {/* Not while editing: the edit layout already shows the relations across tabs. */}
            {(editLayout ? [] : elsewhere).map((g) => (
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
            {session.canEdit && !session.editing && (sel.level === "product" || sel.level === "customizationOption") ? (
              <Button size="xs" variant="outline" className="ml-auto" disabled={session.refreshing} title={session.refreshing ? EDIT.refreshingMap : undefined} onClick={() => session.setEditing(true)}>
                <Pencil /> {session.refreshing ? EDIT.refreshingMap : EDIT.mapEdit}
              </Button>
            ) : null}
            <Button
              size="xs"
              variant="ghost"
              className={session.canEdit && !session.editing && (sel.level === "product" || sel.level === "customizationOption") ? "" : "ml-auto"}
              onClick={clearSelection}
            >
              {COPY.clear}
            </Button>
          </div>
        ) : (
          <p className="truncate text-xs text-muted-foreground">{COPY.hint}</p>
        )}
      </div>

      {editingHere ? (
        <div className="flex flex-wrap items-center gap-3">
          <Picker
            className="max-w-sm"
            choices={addChoices}
            placeholder={sel!.level === "product" ? EDIT.addOptionHere : EDIT.addProductHere}
            onPick={(c) => {
              const i = indexOf.get(`${sel!.level === "product" ? "customizationOption" : "product"}:${c.id}`);
              if (sel!.level === "product") offerOn(sel!.id, c.id, true, i !== undefined && offers.has(i));
              else offerOn(c.id, sel!.id, true, i !== undefined && compatible.has(i));
            }}
          />
          {sel!.level === "customizationOption" ? (
            <Picker
              className="max-w-sm"
              choices={nodes.flatMap((n, i) =>
                // Active options only: the rules (session.meta) know no others.
                n.level === "customizationOption" && i !== selected && !compatOptionsShown.has(i) && Boolean(session.meta?.optionType[n.id])
                  ? [{ id: n.id, title: n.title, group: parentsOf[i]?.[0] !== undefined ? nodes[parentsOf[i]![0]!]!.title : "" }]
                  : [])}
              placeholder={EDIT.makeCompatible}
              onPick={(c) => session.put({ kind: "pair", a: sel!.id, b: c.id, compatible: true })}
            />
          ) : null}
          {editNote ? <span className="text-xs text-destructive">{editNote}</span> : null}
        </div>
      ) : null}

      <div ref={row} className="flex min-h-[28rem] flex-1 gap-3" style={boxH ? { height: boxH } : undefined}>
        <div
          ref={area}
          // The box scrolls only in the edit layout and the full diagram; when the columns scroll on their own
          // it reserves no scrollbar gutter, which showed as a pale strip past the header band (2026-10-15).
          className={`relative min-w-0 flex-1 overflow-x-hidden rounded-md border border-border bg-muted/30 ${columnsMode || virtualCols ? "overflow-y-hidden" : "overflow-y-auto [scrollbar-gutter:stable]"}`}
        >
          {/* Fixed to the box when columns scroll on their own: cards past its edge must not scroll the box. */}
          <div
            className={`relative ${columnsMode || virtualCols ? "overflow-clip" : ""}`}
            // At least the box's width: the columns round down, and the header band must still reach its edge.
            style={{ width, minWidth: "100%", height: columnsMode || virtualCols ? Math.max(HEAD_H, areaH - 1) : height + PAD }}
          >
            <svg
              width={width}
              height={columnsMode || virtualCols ? Math.max(HEAD_H, areaH - 1) : height}
              className="pointer-events-none absolute inset-0"
              aria-hidden
            >
              <defs>
                <marker
                  id="spec-map-arrow-on"
                  viewBox="0 0 8 8"
                  refX="8"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path d="M0,0.5 L8,4 L0,7.5 z" fill={LINE.on} />
                </marker>
              </defs>
              {/*
                No arrows between cards (Richard, 2026-10-14): the relations are named on the headers, and a
                card's links show by grouping and on hover. Drawn here: the rails that hang cards under a
                heading in their own column, and the hover lines.
              */}
              {focus && !from ? (
                <g fill="none" className="animate-in fade-in fill-mode-backwards duration-200 delay-300">
                  {offerUi?.rails.map((r) =>
                    r.ticks.length ? (
                      <path
                        key={`rail-${r.state}`}
                        d={rail(offerUi.x, r.y1, r.ticks, offAt(offerUi.x))}
                        stroke={LINE.on}
                        strokeDasharray={OFFER_DASH[r.state]}
                        strokeLinecap={r.state === "added" ? "round" : undefined}
                      />
                    ) : null,
                  )}
                  {productFocus
                    ? focus.propRails.map((r) => {
                        const x = PAD + levels.indexOf(MAP_PROPERTY) * colW;
                        return <path key={`prop-${r.y1}`} d={rail(x, r.y1, r.ticks, offAt(x))} stroke={LINE.rest} />;
                      })
                    : null}
                </g>
              ) : null}
              {hovered !== null && hoverSet && focus && !from ? (
                <g fill="none" strokeLinejoin="round">
                  {/* A derived option and its partners: arcs in the gutter beside their column. */}
                  {offerUi
                    ? (derivedFrom.has(hovered)
                        ? derivedFrom.get(hovered)!.map((p) => [p, hovered] as const)
                        : (partnersOf.get(hovered) ?? []).map((d) => [hovered, d] as const)
                      )
                        .filter(([p, d]) => focus.pos.has(p) && focus.pos.has(d))
                        .map(([p, d]) => {
                          const a = view(posOf(p)!);
                          const b = view(posOf(d)!);
                          const right = offerUi.x + cardW;
                          const bend = right + Math.max(6, Math.min(14, colW - cardW - 6));
                          return (
                            <path
                              key={`via-${p}-${d}`}
                              d={`M${right},${a.y + CARD_H / 2} H${bend} V${b.y + CARD_H / 2} H${right + 2}`}
                              stroke="var(--color-blue-600, #2563eb)"
                              strokeWidth={1.5}
                              markerEnd="url(#spec-map-arrow-on)"
                            />
                          );
                        })
                    : null}
                  {/* Neighbouring columns: a thin line from the hovered card to each card it links to (not
                      from the selection — everything on screen is its link). */}
                  {(hovered === selected ? [] : [...hoverSet])
                    .filter((j) => j !== hovered && focus.pos.has(j) && focus.pos.has(hovered) && !isGone(j))
                    .flatMap((j) => {
                      const ca = colOfX(focus.pos.get(hovered)!.x);
                      const cb = colOfX(focus.pos.get(j)!.x);
                      if (Math.abs(ca - cb) !== 1) return [];
                      const [l, r] = ca < cb ? [hovered, j] : [j, hovered];
                      const pl = view(posOf(l)!);
                      const pr = view(posOf(r)!);
                      const x1 = PAD + Math.min(ca, cb) * colW + cardW;
                      const x2 = pr.x - 1;
                      const mx = x1 + Math.round((PAD + Math.max(ca, cb) * colW - x1) / 2);
                      const y1 = Math.max(HEAD_H, Math.min(areaH, pl.y + CARD_H / 2));
                      const y2 = Math.max(HEAD_H, Math.min(areaH, pr.y + CARD_H / 2));
                      return [
                        <path
                          key={`hover-${l}-${r}`}
                          d={`M${x1},${y1} H${mx} V${y2} H${x2}`}
                          stroke={LINE.on}
                          strokeWidth={1.25}
                          markerEnd="url(#spec-map-arrow-on)"
                        />,
                      ];
                    })}
                </g>
              ) : null}
            </svg>

            {levels.map((level, li) => {
              const head = { left: PAD + li * colW, width: headW, icon: iconOf(level) };
              if (streamOf(level) !== stream)
                return (
                  <ColumnHeader
                    key={level}
                    {...head}
                    name={level === "product" ? EDIT.offeredOn : level === COMPATIBLE ? EDIT.compatibleWith : COPY.offered}
                    relation={level === "customizationOption" && sel ? COPY.relation(MAP_ENTITY[sel.level] ?? "", COPY.verb.offers) : null}
                    count={
                      level === COMPATIBLE
                        ? compatOptionsShown.size
                        : level === "product"
                          ? [...compatibleShown].filter((i) => nodes[i]!.level === "product").length
                          : shownOffers.size ? [...shownOffers.keys()].filter(statusOk).length : "…"
                    }
                  />
                );
              const total = (byLevel.get(level) ?? []).length;
              const count = focus
                ? relatedIn(level)
                : collapsed.has(level)
                  ? total
                  : (byLevel.get(level) ?? []).filter((i) => rest.pos.has(i)).length;
              const rel = HEAD_RELATION[level];
              return (
                <ColumnHeader
                  key={level}
                  {...head}
                  name={mapLabelOf(level) ?? level}
                  title={LEVEL_INFO.get(level)?.label}
                  relation={rel ? COPY.relation(MAP_ENTITY[rel.from] ?? "", COPY.verb[rel.verb]) : null}
                  count={count === total ? total : `${count}/${total}`}
                />
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

            {focus?.editCols && !from ? focus.editCols.map((c) => (
              <div key={c.key} className="animate-in fade-in duration-200">
                <div className="absolute" style={{ left: c.x, top: c.filterY + 4, width: cardW }}>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={colQ[c.key] ?? ""}
                    onChange={(e) => setColQ((q) => ({ ...q, [c.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Escape" && setColQ((q) => ({ ...q, [c.key]: "" }))}
                    placeholder={c.placeholder}
                    aria-label={c.placeholder}
                    className="h-8 bg-card pl-8 text-xs"
                  />
                  {(colQ[c.key] ?? "").trim() ? (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">{COPY.ofTotal(c.shown, c.total)}</span>
                  ) : null}
                </div>
                {c.labels.map((l) => (
                  <GroupHeading key={l.key} label={l} left={c.x} width={cardW} foldable onToggle={() => toggleFold(l.key)} />
                ))}
              </div>
            )) : null}
            {offerUi ? (
              <div className="animate-in fade-in duration-200">
                {/*
                  While the column scrolls (Richard, 2026-10-14) the filter stays at its top, and the open
                  group's heading sticks under it until the next heading pushes it away; cards pass under both.
                */}
                {virtualCols ? (
                  <div aria-hidden className="pointer-events-none absolute z-[14] bg-background" style={{ left: offerUi.x - 4, top: HEAD_H - 4, width: cardW + 8, height: FILTER_H + 4 }}>
                    <div className="size-full bg-muted/30" />
                  </div>
                ) : null}
                <div
                  className="absolute z-[14]"
                  style={{
                    left: offerUi.x,
                    top: offerUi.filterY + 4 - (virtualCols ? 0 : offAt(offerUi.x)),
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
                {offerUi.groups.map((g, k) => (
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
                    className={`absolute z-[13] flex items-center gap-2 rounded-md border border-border bg-card px-2.5 text-left text-xs font-semibold shadow-xs enabled:hover:bg-muted disabled:cursor-default ${g.total ? "text-foreground" : "text-muted-foreground"}`}
                    style={{
                      left: offerUi.x,
                      top: offerHeadTop(offerUi, k),
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
                  <GroupHeading key={t.key} label={{ ...t, y: t.y - offAt(offerUi.x) }} left={offerUi.x + INDENT} width={cardW - INDENT} foldable={editLayout} onToggle={() => toggleFold(t.key)} />
                ))}
              </div>
            ) : null}

            {(columnsMode ? [] : drawn).map((i) => (onMap(i) ? renderCard(i, virtualCols ? view(posOf(i)!) : posOf(i)!) : null))}
            {/* The focused view's group headings (they fold), and the band the scrolled cards pass under. */}
            {grouped && !from
              ? grouped.heads.map((h) => (
                  <GroupHeading key={h.key} label={{ ...h, y: h.y - offAt(h.x) }} left={h.x} width={cardW} foldable onToggle={() => toggleFold(h.key)} />
                ))
              : null}
            {virtualCols ? (
              <>
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[15] bg-background" style={{ height: HEAD_H - 4 }}>
                  <div className="size-full bg-muted/30" />
                </div>
                {[...colBottom].map(([c, bottom]) => {
                  const total = bottom + PAD - HEAD_H;
                  const vis = areaH - HEAD_H;
                  if (total <= vis) return null;
                  const h = Math.max(24, (vis / total) * vis);
                  const top = HEAD_H + (offAt(PAD + c * colW) / (total - vis)) * (vis - h);
                  return (
                    <div
                      key={`thumb-${c}`}
                      role="scrollbar"
                      aria-orientation="vertical"
                      aria-valuenow={Math.round(offAt(PAD + c * colW))}
                      aria-valuemax={Math.round(total - vis)}
                      className="absolute z-20 w-1.5 cursor-grab rounded-full bg-foreground/20 hover:bg-foreground/40"
                      style={{ left: PAD + c * colW + cardW + Math.min(10, (colW - cardW) / 3), top, height: h }}
                      onPointerDown={(e) => {
                        e.preventDefault(); // a drag must not select the page's text
                        const startY = e.clientY;
                        const start = offAt(PAD + c * colW);
                        const per = (total - vis) / Math.max(1, vis - h);
                        const move = (ev: PointerEvent) => scrollCol(c, start + (ev.clientY - startY) * per);
                        const up = () => {
                          window.removeEventListener("pointermove", move);
                          window.removeEventListener("pointerup", up);
                        };
                        window.addEventListener("pointermove", move);
                        window.addEventListener("pointerup", up);
                      }}
                    />
                  );
                })}
              </>
            ) : null}
            {columnsMode
              ? levels.map((level, li) => {
                  if (streamOf(level) !== stream || collapsed.has(level)) return null;
                  const cards = (byLevel.get(level) ?? []).filter((i) => colPos.has(i));
                  const bottom = cards.length * ROW_H;
                  return (
                    <div
                      key={level}
                      ref={(el) => {
                        if (el) colRefs.current.set(level, el);
                        else colRefs.current.delete(level);
                      }}
                      className="absolute overflow-y-auto overflow-x-hidden [scrollbar-width:thin]"
                      style={{ left: PAD + li * colW, top: HEAD_H, width: Math.min(colW - 4, cardW + 14), height: Math.max(CARD_H, areaH - HEAD_H - 4) }}
                    >
                      <div className="relative" style={{ height: bottom + PAD }}>
                        {cards.map((i) => renderCard(i, { x: 0, y: colPos.get(i)!.y - HEAD_H }))}
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </div>

        {/* The record slides in from the right and takes its place beside the map (Eric, 2026-10-09). */}
        {sel && editLayout ? (
          <aside aria-label={EDIT.barLabel} style={{ width: panelW }} className="flex shrink-0 flex-col overflow-hidden rounded-md border border-foreground/20 bg-card">
            <RuleEditPanel
              // Closing never discards pending changes — that is Cancel's job, said in words.
              onClose={session.edits.length ? undefined : () => session.setEditing(false)}
              details={
                record?.for === selected && record.res.ok && record.res.data
                  ? <SpecRecordView record={record.res.data as CatalogRecord} heading="h2" onSelect={selectBy} rulesEditor={false} />
                  : <p className="text-sm text-muted-foreground">{COPY.loading}</p>
              }
            />
          </aside>
        ) : sel ? (
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
                  {isPropertyLevel(sel.level) ? null : (
                    <Link
                      href={recordHref(sel.level, sel.id)}
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                    >
                      {COPY.openFullPage} <ArrowUpRight className="size-3.5" />
                    </Link>
                  )}
                  {compatible.size ? (
                    <span>{COPY.compatible(compatible.size)}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={clearSelection}
                  aria-label={COPY.close}
                >
                  <X />
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
              {isPropertyLevel(sel.level) ? (
                <p className="text-sm text-muted-foreground">{COPY.propertyCard}</p>
              ) : !record || record.for !== selected ? (
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
                  rulesEditor={false}
                />
              )}
            </div>
          </aside>
        ) : null}
      </div>
      {/* While editing, the panel on the right is the editor's companion; the bar is for after a submit. */}
      {editLayout ? null : <RuleEditBar />}
    </div>
  );
}

/** A short sample of a kind's line, for the chips and group headers. */
function OfferSwatch({ state }: { state: OfferKind }) {
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

/** A heading's rail: down the column's left edge from the heading, with a tick into each card. */
function rail(x: number, y1: number, ticks: number[], off: number): string {
  return `M${x + RAIL},${y1 - off} V${ticks.at(-1)! - off}${ticks.map((t) => ` M${x + RAIL},${t - off} H${x + INDENT - 1}`).join("")}`;
}

/**
 * A column's header (Richard, 2026-10-14): the relation into it on a small line ("Line has →"), then
 * icon, name and count — no level number, no fold (a column never folds).
 */
function ColumnHeader({ left, width, icon: Icon, name, title, relation, count }: {
  left: number;
  width: number;
  icon: LucideIcon;
  name: string;
  title?: string;
  relation: string | null;
  count: number | string;
}) {
  return (
    <div className="absolute z-20 flex flex-col justify-center gap-0.5" style={{ left, top: 6, width, height: HEAD_H - 14 }}>
      <span className="truncate text-[11px] leading-[14px] text-muted-foreground">{relation ?? "\u00a0"}</span>
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <ColumnName title={title}>{name}</ColumnName>
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
    </div>
  );
}

/** A column's name in its header: wraps to a second line rather than cutting off with "…". */
function ColumnName({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="line-clamp-2 min-w-0 text-[13px] font-semibold leading-4 text-foreground" title={title ?? (typeof children === "string" ? children : undefined)}>
      {children}
    </span>
  );
}

/** A small round action on a card's corner. */
function CardAction({ icon: Icon, label, onClick, tone }: { icon: LucideIcon; label: string; onClick: () => void; tone?: "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs ${tone === "danger" ? "hover:border-red-500 hover:text-red-600" : "hover:text-foreground"}`}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

/** A group's heading over its cards; in edit mode a button that folds the group. */
function GroupHeading({ label: l, left, width, foldable, onToggle }: { label: GroupLabel; left: number; width: number; foldable: boolean; onToggle: () => void }) {
  const text = "truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
  if (!foldable) {
    return <span className={`absolute ${text}`} style={{ left, top: l.y, width, lineHeight: `${TYPE_H}px` }}>{l.title}</span>;
  }
  return (
    <button
      type="button"
      aria-expanded={!l.folded}
      onClick={onToggle}
      title={l.folded ? EDIT_FOLD.unfold(l.title) : EDIT_FOLD.fold(l.title)}
      className="absolute flex items-center gap-1 rounded hover:bg-muted"
      style={{ left, top: l.y, width, height: TYPE_H }}
    >
      {l.folded ? <ChevronRight className="size-3 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-3 shrink-0 text-muted-foreground" />}
      <span className={text}>{l.title}</span>
      {l.folded ? <span className="text-[11px] tabular-nums text-muted-foreground">{l.count}</span> : null}
      {l.folded && l.changed ? <span className="size-1.5 shrink-0 rounded-full bg-blue-600" aria-label={EDIT_FOLD.changed} /> : null}
    </button>
  );
}
