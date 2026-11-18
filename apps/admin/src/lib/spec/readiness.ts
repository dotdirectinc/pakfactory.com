import type {
  LibraryReviewState,
  MappingItem,
  MappingKind,
} from "@/lib/spec/registry-api";
import { DEFAULT_LINE, LINES, type LineKey } from "@/lib/spec/library-review";
import { KINDS } from "@/lib/spec/mapping-review";

/**
 * Readiness (Job specs): for each website spec, whether a job spec could be built from it with
 * approved data only — its map approved, and every production record the map resolves to approved.
 * A job spec revision is released to a vendor only when every record it uses is approved (PLAT-83,
 * proposal section 6b); this page shows how far each website spec is from that.
 */

export type ReadinessStatus = "ready" | "mapping" | "library" | "gap";

export const READINESS_STATUSES: {
  key: ReadinessStatus;
  label: string;
  hint: string;
}[] = [
  {
    key: "ready",
    label: "Ready",
    hint: "Map approved and every production record it uses approved.",
  },
  {
    key: "mapping",
    label: "Waiting on mapping",
    hint: "The map has not been approved yet (Mapping review).",
  },
  {
    key: "library",
    label: "Waiting on library",
    hint: "The map is approved, but some production records it uses are not, or a preset has no production record yet (Library review).",
  },
  {
    key: "gap",
    label: "Gap",
    hint: "No production equivalent, or the map was rejected: no job spec can be built from it today.",
  },
];

/** A production record a map resolves to, keyed by spec_production collection and source id. */
export type RecordRef = {
  collection: string;
  sourceId: string;
  name: string | null;
};

export const recordKey = (r: Pick<RecordRef, "collection" | "sourceId">) =>
  `${r.collection}:${r.sourceId}`;

/** What a product type is built from: itself and its template chain (global → line → type). */
export type ProductTypeChain = Map<string, RecordRef[]>;

/**
 * The production records a map uses: its targets — a product type with its template chain, or a
 * capability / field — and the presets that name a production record. Each once, in that order.
 */
export function recordsOf(
  item: Pick<MappingItem, "targets" | "presets">,
  chains: ProductTypeChain,
): RecordRef[] {
  const out = new Map<string, RecordRef>();
  const add = (r: RecordRef) => {
    if (!out.has(recordKey(r))) out.set(recordKey(r), r);
  };
  for (const t of item.targets) {
    const chain =
      t.kind === "product_type" ? chains.get(t.sourceId) : undefined;
    if (chain) chain.forEach(add);
    else add({ collection: t.kind, sourceId: t.sourceId, name: t.name });
  }
  for (const p of item.presets) {
    if (p.sourceId)
      add({
        collection: collectionOfCode(p.sourceId),
        sourceId: p.sourceId,
        name: p.value ? `${p.label} = ${p.value}` : p.label,
      });
  }
  return [...out.values()];
}

/** A preset's production code → its collection (CAP-… capability, FLD-… field, PT-… product type). */
export function collectionOfCode(code: string): string {
  if (code.startsWith("PT-")) return "product_type";
  if (code.startsWith("FLD-")) return "field";
  if (code.startsWith("TPL-")) return "template";
  return "capability";
}

export type Readiness = {
  status: ReadinessStatus;
  records: (RecordRef & { state: LibraryReviewState })[];
  approved: number;
  /** Presets stored as text: a production record still has to be added for them. */
  needsCode: number;
};

export function readinessOf(
  item: Pick<
    MappingItem,
    "label" | "state" | "targets" | "presets" | "presetsNeedingCode"
  >,
  chains: ProductTypeChain,
  stateOf: (r: RecordRef) => LibraryReviewState | undefined,
): Readiness {
  const records = recordsOf(item, chains).map((r) => ({
    ...r,
    state: stateOf(r) ?? ("pending" as const),
  }));
  const approved = records.filter((r) => r.state === "approve").length;
  const needsCode = item.presetsNeedingCode;
  const status: ReadinessStatus =
    item.label === "no_equivalent" || item.state === "reject"
      ? "gap"
      : item.state !== "approve"
        ? "mapping"
        : approved < records.length || needsCode > 0
          ? "library"
          : "ready";
  return { status, records, approved, needsCode };
}

export function countStatuses(
  rs: Pick<Readiness, "status">[],
): Record<ReadinessStatus, number> {
  const c: Record<ReadinessStatus, number> = {
    ready: 0,
    mapping: 0,
    library: 0,
    gap: 0,
  };
  for (const r of rs) c[r.status]++;
  return c;
}

export type ReadinessParams = {
  kind: MappingKind;
  line: LineKey;
  status: ReadinessStatus | null;
};

export function readinessParams(sp: {
  kind?: string;
  line?: string;
  status?: string;
}): ReadinessParams {
  return {
    kind: KINDS.some((k) => k.key === sp.kind)
      ? (sp.kind as MappingKind)
      : "product",
    line: LINES.some((l) => l.key === sp.line && l.key !== "all")
      ? (sp.line as LineKey)
      : DEFAULT_LINE,
    status: READINESS_STATUSES.some((s) => s.key === sp.status)
      ? (sp.status as ReadinessStatus)
      : null,
  };
}

export function readinessHref(p: Partial<ReadinessParams>): string {
  const q = new URLSearchParams();
  if (p.kind && p.kind !== "product") q.set("kind", p.kind);
  if (p.line && p.line !== DEFAULT_LINE) q.set("line", p.line);
  if (p.status) q.set("status", p.status);
  const s = q.toString();
  return s ? `/spec/readiness?${s}` : "/spec/readiness";
}
