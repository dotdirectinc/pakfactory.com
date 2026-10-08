/**
 * Catalog tables (PROD-2926): a Notion-like, read-only table per record type, grouped in three
 * streams with a level picker. Every field a published Sanity document holds is offered as a
 * column — Sanity is the main source of truth (2026-10-07) and every document carries its registry
 * id and code, so one read per table covers both. Values are flattened to display text here, on the
 * server, so the client only sorts, filters and arranges columns.
 */

export type TableKey =
  | "productLine" | "productStyle" | "product"
  | "customizationCategory" | "customizationType" | "customizationOption"
  | "solution" | "solutionStyle" | "inspiration"
  | "productValue" | "optionValue";

/** `defaultLevel`: the level a tab opens on — the records themselves, not their vocabulary. */
export type TableGroup = {
  key: "products" | "customizations" | "solutions";
  label: string;
  levels: { key: TableKey; label: string }[];
  defaultLevel: TableKey;
};

export const TABLE_GROUPS: TableGroup[] = [
  { key: "products", label: "Products", levels: [
    { key: "productLine", label: "Product lines" },
    { key: "productStyle", label: "Product styles" },
    { key: "product", label: "Standard products" },
    { key: "productValue", label: "Product properties & values" },
  ], defaultLevel: "product" },
  { key: "customizations", label: "Customizations", levels: [
    { key: "customizationCategory", label: "Categories" },
    { key: "customizationType", label: "Types" },
    { key: "customizationOption", label: "Options" },
    { key: "optionValue", label: "Option properties & values" },
  ], defaultLevel: "customizationOption" },
  { key: "solutions", label: "Solutions", levels: [
    { key: "solution", label: "Solutions" },
    { key: "solutionStyle", label: "Solution styles" },
    { key: "inspiration", label: "Inspiration products" },
  ], defaultLevel: "inspiration" },
];

export type TableSpec = {
  type: string;
  /** Extra GROQ filter, e.g. standard vs inspiration products. */
  filter?: string;
  /** Fields shown by default, in order, after the image and name. */
  defaults: string[];
  /** The field filtered as "parent". */
  parent?: string;
  /** The record's rules view, when it has one (standard products; active options); null when not. */
  rules?: (doc: Doc) => string | null;
  /**
   * GROQ for the record's preview image (2026-10-08, Richard): the first image in the Studio
   * "Media" field (`media[0]`) for every type that has one; a type without a Media field (solution,
   * solution style) uses its Featured image. Absent: no image column.
   */
  image?: string;
};

const MEDIA_FIRST = "media[0].asset->url";
const FEATURED = "featuredImage.asset->url";

export const SPECS: Record<TableKey, TableSpec> = {
  productLine: { type: "productLine", image: MEDIA_FIRST, defaults: ["entityCode", "status", "slug"] },
  productStyle: { type: "productStyle", image: MEDIA_FIRST, defaults: ["entityCode", "status", "productLine"], parent: "productLine" },
  product: {
    type: "product", filter: `kind != "inspiration"`, image: MEDIA_FIRST, parent: "productLine",
    defaults: ["entityCode", "status", "productLine", "productStyle", "moq", "leadTimeBusinessDaysMin", "leadTimeBusinessDaysMax"],
    // Every standard product has a rules view, whatever its status (the product view reads them all).
    rules: (d) => `/spec/products/${encodeURIComponent(d._id)}`,
  },
  customizationCategory: { type: "customizationCategory", defaults: ["entityCode", "status"] },
  customizationType: { type: "customizationType", defaults: ["entityCode", "status", "category", "customerSelects"], parent: "category" },
  customizationOption: {
    type: "customizationOption", image: MEDIA_FIRST, parent: "type",
    defaults: ["entityCode", "status", "type", "configuratorRole", "hasPage"],
    // Only active options are in the rules, so only they have a rules view (hasRulesPage).
    rules: (d) => (d.status === "active" ? `/spec/customizations/${encodeURIComponent(d._id)}` : null),
  },
  solution: { type: "solution", image: FEATURED, defaults: ["entityCode", "status", "solutionType"] },
  solutionStyle: { type: "solutionStyle", image: FEATURED, defaults: ["entityCode", "status", "solution"], parent: "solution" },
  inspiration: {
    type: "product", filter: `kind == "inspiration"`, image: MEDIA_FIRST, parent: "solutions",
    defaults: ["entityCode", "status", "basedOn", "solutions"],
  },
  // One row per property value (properties are one shared vocabulary): the values of every property
  // the stream uses, with how many of its records use each. The loader adds the usage fields.
  productValue: {
    type: "propertyValue", parent: "property",
    defaults: ["property", "usedByProducts", "productExamples", "kindOf", "facts", "entityCode"],
  },
  optionValue: {
    type: "propertyValue", parent: "property",
    defaults: ["property", "usedByOptions", "optionExamples", "kindOf", "facts", "entityCode"],
  },
};

export const isTableKey = (k: string | undefined): k is TableKey => Boolean(k && k in SPECS);

/** `numeric`: every value present is a number — right-aligned, sorted as numbers. */
export type CatalogColumn = { key: string; label: string; numeric?: boolean };
export type CatalogRow = {
  id: string;
  href: string | null;
  /** Small and large preview URLs (Sanity image CDN), when the record has an image. */
  image: { thumb: string; large: string } | null;
  cells: Record<string, string | number | null>;
};
export type CatalogTable = {
  key: TableKey;
  dataset: string;
  columns: CatalogColumn[];
  /** Column keys shown until the viewer changes them. */
  defaults: string[];
  parent: string | null;
  hasImages: boolean;
  rows: CatalogRow[];
};

/** Never offered as columns: internal or covered elsewhere (the image column, the row link). */
export const HIDDEN = new Set([
  "_id", "_type", "_rev", "_system", "_image", "orderRank",
  // Images and video: the image column shows the preview.
  "media", "featuredImage", "images", "lifestyleImages", "videos",
]);

const LABELS: Record<string, string> = {
  title: "Name",
  entityCode: "Registry code",
  entityId: "Registry ID",
  moq: "MOQ",
  sku: "SKU",
  h1: "H1",
  leadTimeBusinessDaysMin: "Lead time min (days)",
  leadTimeBusinessDaysMax: "Lead time max (days)",
  _createdAt: "Created",
  _updatedAt: "Last updated",
  basedOn: "Based on",
  usedByProducts: "Used by products",
  productExamples: "Products (examples)",
  usedByOptions: "Used by options",
  optionExamples: "Options (examples)",
  kindOf: "Kind of",
};

export const columnLabel = (key: string) =>
  LABELS[key] ??
  key
    .replace(/^_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

export type Doc = Record<string, unknown> & { _id: string; _image?: string | null };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every `_ref` in a value, deeply — so references inside objects resolve to names too. */
export function collectRefs(v: unknown, out: Set<string>) {
  if (Array.isArray(v)) for (const x of v) collectRefs(x, out);
  else if (isObj(v)) {
    if (typeof v._ref === "string" && !v._ref.startsWith("image-") && !v._ref.startsWith("file-")) out.add(v._ref);
    for (const [k, x] of Object.entries(v)) if (k !== "_ref") collectRefs(x, out);
  }
}

const blockText = (blocks: unknown[]) =>
  blocks
    .map((b) => (isObj(b) && Array.isArray(b.children) ? b.children.map((c) => (isObj(c) ? String(c.text ?? "") : "")).join("") : ""))
    .filter(Boolean)
    .join(" ");

/** A reference to a document that is not published (draft-only or deleted). */
const UNPUBLISHED = "(not published)";

/** A field's value as one display cell. */
export function cellOf(v: unknown, names: Map<string, string>): string | number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  // Long text is cut: the table previews it, the record page or Studio holds it (and the cached table stays small).
  if (typeof v === "string") return v.length > 300 ? `${v.slice(0, 300)}…` : v;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) {
    if (!v.length) return null;
    if (isObj(v[0]) && v[0]._type === "block") return blockText(v).slice(0, 300) || null;
    if (v.every((x) => isObj(x) && typeof x._ref === "string")) return v.map((x) => names.get(String((x as { _ref: string })._ref)) ?? UNPUBLISHED).join(", ");
    if (v.every((x) => typeof x !== "object")) return v.join(", ");
    // Label/value pairs (a value's facts): "Weight: 1.2 kg · Width: 30 cm".
    if (v.every((x) => isObj(x) && typeof x.label === "string")) {
      return v
        .map((x) => {
          const o = x as Record<string, unknown>;
          const val = o.text ?? o.value ?? o.number;
          return `${columnLabel(String(o.label))}${val !== undefined && val !== null ? `: ${String(val)}${o.unit ? ` ${String(o.unit)}` : ""}` : ""}`;
        })
        .join(" · ");
    }
    // Objects (properties, availability rows…): what they reference, else how many there are.
    const refs = new Set<string>();
    collectRefs(v, refs);
    const titled = [...refs].map((r) => names.get(r)).filter(Boolean);
    return titled.length ? titled.join(", ") : `${v.length} ${v.length === 1 ? "entry" : "entries"}`;
  }
  if (isObj(v)) {
    if (typeof v._ref === "string") return names.get(v._ref) ?? UNPUBLISHED;
    if (v._type === "slug") return typeof v.current === "string" ? v.current : null;
    const refs = new Set<string>();
    collectRefs(v, refs);
    const titled = [...refs].map((r) => names.get(r)).filter(Boolean);
    if (titled.length) return titled.join(", ");
    const parts = Object.entries(v).filter(([k, x]) => !k.startsWith("_") && x !== null && typeof x !== "object");
    return parts.length ? parts.map(([k, x]) => `${columnLabel(k)}: ${String(x)}`).join(" · ") : null;
  }
  return String(v);
}

/** Rows and columns from published documents and the names of everything they reference. */
export function buildCatalogTable(key: TableKey, docs: Doc[], names: Map<string, string>, dataset: string): CatalogTable {
  const spec = SPECS[key];
  const fields = new Set<string>();
  for (const d of docs) for (const k of Object.keys(d)) if (!HIDDEN.has(k)) fields.add(k);
  const ordered = ["title", ...spec.defaults.filter((f) => f !== "title"), ...[...fields].filter((f) => f !== "title" && !spec.defaults.includes(f)).sort()];
  const columns = ordered.filter((f, i, a) => a.indexOf(f) === i && (fields.has(f) || spec.defaults.includes(f))).map((f) => ({ key: f, label: columnLabel(f) }));
  const rows = docs.map((d) => ({
    id: d._id,
    href: recordHref(key, d._id),
    image: d._image ? { thumb: `${d._image}?w=96&h=96&fit=crop&auto=format`, large: `${d._image}?w=480&auto=format` } : null,
    cells: Object.fromEntries(columns.map((c) => [c.key, cellOf(d[c.key], names)])),
  }));
  rows.sort((a, b) => String(a.cells.title ?? "").localeCompare(String(b.cells.title ?? "")));
  for (const c of columns) {
    const present = rows.map((r) => r.cells[c.key]).filter((v) => v !== null && v !== undefined);
    if (present.length && present.every((v) => typeof v === "number")) (c as CatalogColumn).numeric = true;
  }
  return {
    key, dataset, columns, rows, hasImages: Boolean(spec.image), parent: spec.parent ?? null,
    defaults: ["title", ...spec.defaults].filter((f) => columns.some((c) => c.key === f)),
  };
}


// ─── Record pages (2026-10-08, Richard: every record at every level and status has one) ─────────

/** The record page of any catalog row; the table it was opened from gives its level and context. */
export const recordHref = (key: TableKey, id: string) => `/spec/catalog/${key}/${encodeURIComponent(id)}`;

export const levelOf = (key: TableKey) => {
  for (const g of TABLE_GROUPS) {
    const l = g.levels.find((x) => x.key === key);
    if (l) return { group: g, level: l };
  }
  return null;
};

/** The level a referenced document belongs to, so a reference on a record page can link to it. */
export function tableOfDoc(type: string | undefined, kind?: string | null): TableKey | null {
  switch (type) {
    case "productLine": return "productLine";
    case "productStyle": return "productStyle";
    case "product": return kind === "inspiration" ? "inspiration" : "product";
    case "customizationCategory": return "customizationCategory";
    case "customizationType": return "customizationType";
    case "customizationOption": return "customizationOption";
    case "solution": return "solution";
    case "solutionStyle": return "solutionStyle";
    case "propertyValue": return "productValue";
    default: return null;
  }
}

export type RefInfo = { title: string; href: string | null };
export type RecordField = { key: string; label: string; text: string | number | null; links: { title: string; href: string | null }[] };

/** Every field of a record for its page: display text, and the records it references as links. */
export function recordFields(doc: Doc, refs: Map<string, RefInfo>): RecordField[] {
  const names = new Map([...refs].map(([id, r]) => [id, r.title]));
  const keys = ["title", ...Object.keys(doc).filter((k) => k !== "title" && !HIDDEN.has(k) && !k.startsWith("_")).sort(), "_createdAt", "_updatedAt"];
  return keys
    .filter((k, i, a) => a.indexOf(k) === i && k in doc)
    .map((k) => {
      const ids = new Set<string>();
      collectRefs(doc[k], ids);
      return {
        key: k,
        label: columnLabel(k),
        text: cellOf(doc[k], names),
        links: [...ids].map((id) => refs.get(id) ?? { title: UNPUBLISHED, href: null }),
      };
    });
}
