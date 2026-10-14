import { cellOf, collectRefs, columnLabel, HIDDEN, type Doc, type RefInfo } from "./catalog-table-model";

/**
 * A record page's fields, organised (Richard, 2026-10-14): in sections that follow Studio's own field
 * groups (Content, Categorization, Specs, Template, SEO), with Studio's "Specs" split into what the
 * Spec System is about — customizations, properties, specs. Reference lists are grouped: options by
 * Category › Type, property values by their property, a product's properties as property → values.
 *
 * Why some names are links and others are not: a reference links only when its document has a page
 * in the Spec catalog. Properties, glossary terms, case studies… are content with no Spec page (they
 * are edited in Studio), and a reference to an unpublished document has nothing to open. Each group
 * lists the three kinds apart, in that order, so the difference reads as a rule rather than at random.
 */

export type RecordItem = {
  title: string;
  /** A Spec catalog page; null when the document has none (or is not published). */
  href: string | null;
  published: boolean;
  /** Short qualifiers: "pre-selected", "add", "shown on page"… */
  tags: string[];
  /** A sentence that belongs to this item (an exception's reason). */
  note?: string;
};
export type RecordGroup = { title: string | null; items: RecordItem[] };
export type RecordEntry = { key: string; label: string; text: string | number | null; groups: RecordGroup[] };
export type RecordSection = { key: SectionKey; title: string; fields: RecordEntry[] };

type SectionKey = "overview" | "structure" | "customizations" | "properties" | "specs" | "page" | "seo" | "system" | "other";

/** Sections in page order; each lists its fields in display order (fields of every level share names). */
const SECTIONS: { key: SectionKey; title: string; fields: string[] }[] = [
  {
    key: "overview",
    title: "Overview",
    fields: ["title", "h1", "shortName", "slug", "kind", "status", "solutionType", "shortDescription", "description", "glossaryTerm", "appearsIn", "benefits", "kitMark"],
  },
  {
    key: "structure",
    title: "Catalog structure",
    fields: [
      "productLine", "productStyle", "basedOn", "solutions", "solution", "category", "type", "property", "kindOf",
      "relatedProducts", "relatedLines", "featuredProducts", "featuredStudies", "relatedCaseStudies", "expertise", "achieves", "filter", "excludedProducts",
    ],
  },
  {
    key: "customizations",
    title: "Customizations",
    fields: [
      "availableCustomizations", "customizationExceptions", "compatibleCustomizations", "customerSelects", "availabilityDecidedBy", "dependsOn",
      "rulesListed", "rulesDerived", "rulesExceptions",
    ],
  },
  {
    key: "properties",
    title: "Properties",
    fields: ["properties", "facts", "declaredProperties", "valueCount", "declaredOn", "usedByProducts", "productExamples", "usedByOptions", "optionExamples"],
  },
  { key: "specs", title: "Specs", fields: ["sku", "moq", "leadTimeBusinessDaysMin", "leadTimeBusinessDaysMax", "dimensionInput", "dimensionRange", "specSheet"] },
  { key: "page", title: "Page & template", fields: ["template", "sections", "typeOrder", "optionOrder", "styleOrder", "productOrder", "configuratorRole", "hasPage"] },
  { key: "seo", title: "SEO & social", fields: ["metaTitle", "metaDescription", "ogImage", "allowIndex", "allowFollow", "noImageIndex"] },
  { key: "system", title: "Registry & history", fields: ["entityCode", "entityId", "_createdAt", "_updatedAt"] },
];
const SECTION_OF = new Map(SECTIONS.flatMap((s) => s.fields.map((f, i) => [f, { key: s.key, order: i }] as const)));

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const refOf = (v: unknown) => (isObj(v) && typeof v._ref === "string" ? v._ref : null);

function itemOf(id: string, refs: Map<string, RefInfo>, tags: string[] = [], note?: string): RecordItem & { group: string | null } {
  const r = refs.get(id);
  return r
    ? { title: r.title, href: r.href, published: true, tags, ...(note ? { note } : {}), group: r.group ?? null }
    : { title: "(not published)", href: null, published: false, tags, ...(note ? { note } : {}), group: null };
}

/** Links first, then documents with no Spec page, then unpublished ones; by name within each. */
const RANK = (i: RecordItem) => (i.href ? 0 : i.published ? 1 : 2);
const ordered = (items: RecordItem[]) => [...items].sort((a, b) => RANK(a) - RANK(b) || a.title.localeCompare(b.title));

/** A field's references as groups. Empty when it references nothing. */
export function groupsOf(value: unknown, refs: Map<string, RefInfo>): RecordGroup[] {
  const explicit: RecordGroup[] = [];
  const loose: (RecordItem & { group: string | null })[] = [];
  const list = Array.isArray(value) ? value : [value];
  for (const x of list) {
    const ref = refOf(x);
    if (ref) {
      loose.push(itemOf(ref, refs));
      continue;
    }
    if (!isObj(x)) continue;
    // A product's property: the property heads its group, its values are the items.
    const prop = refOf(x.property);
    if (prop && Array.isArray(x.values)) {
      const head = refs.get(prop);
      explicit.push({
        title: head?.title ?? "(not published)",
        items: ordered(x.values.flatMap((v) => (refOf(v) ? [itemOf(refOf(v)!, refs)] : [])).map(({ group: _g, ...i }) => i)),
      });
      continue;
    }
    // A declared property (types, lines): the property, with how it is declared.
    if (prop) {
      const tags = [
        typeof x.usage === "string" ? x.usage : null,
        x.required === true ? "required" : null,
        x.showOnDetailPage === true ? "shown on page" : null,
      ].filter((t): t is string => Boolean(t));
      loose.push(itemOf(prop, refs, tags));
      continue;
    }
    // An offered option (pre-selected on an inspiration product) or an exception (add/remove + reason).
    const option = refOf(x.customization);
    if (option) {
      const tags = [x.preselected === true ? "pre-selected" : null, typeof x.mode === "string" ? x.mode : null].filter((t): t is string => Boolean(t));
      loose.push(itemOf(option, refs, tags, typeof x.reason === "string" && x.reason.trim() ? x.reason.trim() : undefined));
      continue;
    }
    // Anything else that references records: those records.
    const ids = new Set<string>();
    collectRefs(x, ids);
    for (const id of ids) loose.push(itemOf(id, refs));
  }
  if (!loose.length) return explicit.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

  // Group by the records' own group (an option's Category › Type, a value's property) when a list has
  // more than one record and any of them has one; a single reference stays a single line.
  const grouped = Array.isArray(value) && loose.length > 1 && loose.some((i) => i.group);
  const byGroup = new Map<string | null, RecordItem[]>();
  for (const { group, ...item } of loose) {
    const g = grouped ? group : null;
    byGroup.set(g, [...(byGroup.get(g) ?? []), item]);
  }
  const looseGroups = [...byGroup]
    .map(([title, items]) => ({ title, items: ordered(items) }))
    .sort((a, b) => (a.title === null ? 1 : b.title === null ? -1 : a.title.localeCompare(b.title)));
  return [...explicit.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "")), ...looseGroups];
}

/** Every field of a record for its page, in sections; empty sections are left out. */
export function recordSections(doc: Doc, refs: Map<string, RefInfo>): RecordSection[] {
  const names = new Map([...refs].map(([id, r]) => [id, r.title]));
  const keys = [...Object.keys(doc).filter((k) => !HIDDEN.has(k) && !k.startsWith("_")), "_createdAt", "_updatedAt"].filter(
    (k, i, a) => a.indexOf(k) === i && k in doc,
  );
  const entries = keys.map((k) => {
    const ids = new Set<string>();
    collectRefs(doc[k], ids);
    const entry: RecordEntry = {
      key: k,
      label: columnLabel(k),
      text: ids.size ? null : cellOf(doc[k], names),
      groups: ids.size ? groupsOf(doc[k], refs) : [],
    };
    return entry;
  });
  const out: RecordSection[] = [];
  for (const s of [...SECTIONS, { key: "other" as const, title: "Other fields", fields: [] }]) {
    const fields = entries
      .filter((e) => (SECTION_OF.get(e.key)?.key ?? "other") === s.key)
      .sort((a, b) => {
        const oa = SECTION_OF.get(a.key)?.order ?? Number.MAX_SAFE_INTEGER;
        const ob = SECTION_OF.get(b.key)?.order ?? Number.MAX_SAFE_INTEGER;
        return oa - ob || a.label.localeCompare(b.label);
      });
    if (fields.length) out.push({ key: s.key, title: s.title, fields });
  }
  return out;
}
