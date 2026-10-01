export const ADMIN_SPEC_COPY = {
  listTitle: "Spec registry",
  listLead:
    "Proposed changes to the spec registry, generated from the content team's board and Notion. Nothing here is live until it is approved.",
  empty: "No changes are waiting for review.",
  emptyHint:
    "Frames appear here when the generator loads them. An approved frame moves out of this list.",
  reviewTitle: "Review frame",
  itemsHeading: "What this changes",
  everyChange: "Every change in this frame",
  everyChangeLead:
    "Each line as it will be written. Check these against the board — filter to find a particular product, material or option.",
  approve: "Approve frame",
  discard: "Discard",
  approving: "Approving…",
  discarding: "Discarding…",
  discardConfirm:
    "Discard this frame? It cannot be undone, and reloading it means re-running the generator.",
  discardYes: "Yes, discard",
  readOnlyNote:
    "You can review this frame but not decide it — that needs the approver role.",
  decidedNote: "This frame has already been decided.",
  blockedLead:
    "This frame refers to rows other frames create, so it cannot be approved yet. Approve these first:",
  unreachable:
    "The registry API is not reachable, so pending changes cannot be listed.",
} as const;

/** Current rules (PROD-2560): read from Sanity, computed by the shared rules package. */
export const ADMIN_SPEC_RULES_COPY = {
  title: "Current rules",
  lead:
    "What the rules say right now, read from Sanity and computed by the same code the storefront and Studio use. Edit rules in Studio; this page follows on its next load.",
  datasetNote: (dataset: string) => `Sanity dataset: ${dataset}`,
  unreachable: "Sanity could not be read, so the current rules cannot be shown.",
  tabs: {
    types: "By type",
    options: "By option",
    exceptions: "Product exceptions",
    attention: "Needs attention",
    legacy: "Old explorer rules",
  },
  legacyLead:
    "The hand-written rules the old Property Controls explorer applied, and where each one stands now that the rules come from Sanity. Rules Sanity does not model are left out, not reimplemented — this is the gap list.",
  totals: {
    products: "standard products",
    types: "types",
    options: "options",
    pairs: "compatible pairs",
    exceptions: "exceptions",
  },
  decidedBy: {
    product: "Each product lists them",
    customization: "Decided by other customizations",
  },
  typeState: {
    product: "",
    constrained: "",
    unconstrained: "Nothing narrows this type — every option pairs freely",
    "resolves-to-nothing": "Its requirements name nothing that exists",
  },
  optionStatus: {
    offered: "Offered",
    "offered-nowhere": "Offered nowhere",
    "compatible-with-nothing": "Paired with nothing",
    "unknown-type": "Unknown type",
  },
  relation: {
    requirement: "Needs",
    dependent: "Decides",
    other: "Ordered with",
  },
  filterOptions: "Filter by option, type or registry code…",
  openOption: "open",
  loadingPartners: "Loading pairs…",
  partnersFailed: "Could not load this option's pairs — reload and try again.",
  noMatch: (q: string) => `Nothing matches “${q}”.`,
  unmet: (names: string) => `Can never be offered: no partner in ${names}`,
  exceptionsEmpty: "No product has an exception yet.",
  exceptionsLead:
    "Where one product disagrees with the rules. Only “added” and “removed” change anything; the others are worth fixing in Studio.",
  attentionLead:
    "Things the rules read literally that are probably not what anyone meant.",
  attention: {
    missing: "References to options that no longer exist",
    missingLead:
      "An option still lists these as compatible, but the documents are gone. The pair is ignored.",
    siblings: "Pairs inside a pick-one type",
    siblingsLead: "A customer can only pick one of these, so the pair can never be ordered.",
    reference: "Pairs with a reference-only option",
    referenceLead: "Reference options are information, not choices, so these pairs do nothing.",
    unknownDeps: "Requirements naming nothing that exists",
    none: "Nothing to report.",
  },
} as const;

/** Products & Customizations (PROD-2614): read-only until V1 — edits happen in Studio. */
export const ADMIN_SPEC_PRODUCTS_COPY = {
  listTitle: "Products",
  listLead:
    "Every standard product and what the rules make of it, read from Sanity. Read-only until V1 — edit in Studio.",
  filter: "Filter — a product, a line, a style, a registry code…",
  noMatch: (q: string) => `No product matches “${q}”.`,
  columns: {
    product: "Product",
    code: "Registry ID",
    line: "Line · style",
    listed: "Listed",
    derived: "Derived",
    exceptions: "Exceptions",
  },
  backToList: "All products",
  loadMore: (n: number, left: number) => `Load ${n} more (${left} left)`,
  editInStudio: "Edit in Studio",
  registryId: "Registry ID",
  notRegistered: "Not registered",
  copy: "Copy",
  copied: "Copied",
  tabs: { offers: "What it offers", configure: "Configure as a customer", exceptions: "Exceptions" },
  offersLead:
    "Listed options are the product's own choice. Derived options come from the rules: each says which of the product's options allows it.",
  state: { listed: "Listed", derived: "Derived", added: "Added by exception" },
  because: "allowed by",
  unconstrained: "Nothing narrows this type — every option that pairs with anything is offered.",
  removedHeading: (n: number) => `${n} not offered on this product`,
  removedBecause: (names: string) => `no partner in ${names}`,
  removedByException: "removed by an exception",
  referenceNote: "reference only",
  configureLead:
    "Pick as a customer would. Options narrow exactly as on the storefront — the same code runs both. Nothing here is saved.",
  reset: "Clear picks",
  configuratorLoading: "Loading the rules…",
  configuratorFailed: "Could not load the rules — reload the page and try again.",
  dimensions: "Dimensions",
  pickOne: "pick one",
  pickSeveral: "pick several",
  hiddenByPicks: (names: string) => `Hidden by your picks: ${names}`,
  invalidated: (names: string) => `No longer possible with your other picks: ${names}`,
  exceptionsEmpty: "This product has no exceptions — the rules alone decide what it offers.",
  notFound: "No standard product with this id in the dataset.",
  customizationLead:
    "One option: what it pairs with, and which products end up offering it. Read-only until V1 — edit in Studio.",
  productsOffering: (n: number) => `Offered on ${n} products`,
  pairsHeading: "Pairs with",
  productsHeading: "Products offering it",
} as const;

/**
 * The old Property Controls explorer's hand-written rules (L1–L15), and where each one stands
 * now that the rules come from Sanity (PROD-2614). Rules Sanity does not model are left out of
 * every screen, not reimplemented; this table is the gap list.
 */
export const LEGACY_RULE_COVERAGE: {
  id: string;
  rule: string;
  status: "sanity" | "product-data" | "builder-ui" | "not-modelled";
  note: string;
}[] = [
  { id: "L1", rule: "Tin · Pouches · Mailers · Bags → print outside only", status: "not-modelled", note: "Needs a print-sides field on the product; not modelled (no schema change for now)." },
  { id: "L2", rule: "Labels · Stickers · Accessories · Cardboard Insert → one “Printed?” toggle", status: "not-modelled", note: "Same as L1." },
  { id: "L3", rule: "Foam · Molded Pulp · Plastic Tray Insert → no printing section", status: "sanity", note: "Follows from the rules: a product whose Printing Method resolves to nothing has no printing." },
  { id: "L4", rule: "All print toggles No → hide the other printing options", status: "builder-ui", note: "Form behaviour, not a rule." },
  { id: "L5", rule: "Pantone Spot or Hybrid → Pantone count + PMS codes", status: "builder-ui", note: "Form behaviour of the colour system." },
  { id: "L6", rule: "Pantone count capped at 3", status: "builder-ui", note: "Form validation." },
  { id: "L7", rule: "One PMS code per Pantone count", status: "builder-ui", note: "Form validation." },
  { id: "L8", rule: "Soft Touch → no debossing", status: "sanity", note: "Holds as pairs (checked 2026-09-28). Soft Touch (for non-paper) DOES pair with every debossing option — confirm with Crystal." },
  { id: "L9", rule: "Textured Embossing & Debossing → no other embossing", status: "sanity", note: "Holds: it is paired with no other embossing option (checked 2026-09-28)." },
  { id: "L10", rule: "Textured Embossing & Debossing → requires Uncoated", status: "sanity", note: "Does NOT hold in the data: it pairs with 12 finishes, not only Uncoated (checked 2026-09-28) — confirm with Crystal." },
  { id: "L11", rule: "Foam + Foiling → requires Flocking, Paper or Leather Lamination", status: "not-modelled", note: "A requirement that depends on the material; the requirements model cannot say it." },
  { id: "L12", rule: "Foam + Embossing → requires Paper or Leather Lamination", status: "not-modelled", note: "Same as L11." },
  { id: "L13", rule: "Tin → stock size picklist, or custom L × W × H", status: "not-modelled", note: "Size logic, not modelled." },
  { id: "L14", rule: "Cylinder → Diameter × Height", status: "product-data", note: "product.dimensionInput." },
  { id: "L15", rule: "Bag / Pouch → Width × Height × Gusset", status: "product-data", note: "product.dimensionInput." },
];

export const LEGACY_STATUS_LABEL = {
  sanity: "In Sanity",
  "product-data": "Product data",
  "builder-ui": "Builder UI",
  "not-modelled": "Not modelled",
} as const;

/** Customizations & Properties browsers: everything in Sanity, read-only. */
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  "not-active": "Not active",
  "coming-soon": "Coming soon",
  discontinued: "Discontinued",
};
const USAGE_LABEL: Record<string, string> = { stated: "stated", selectable: "customer picks", hidden: "stated, hidden" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const ADMIN_SPEC_BROWSE_COPY = {
  customizationsTitle: "Customizations",
  customizationsLead:
    "Every category, type and option in Sanity, including options that are not active. Read-only — edit in Studio. An option links to its rules when it is active.",
  customizationTotals: (t: { categories: number; types: number; options: number; registered: number }) =>
    `${plural(t.categories, "category", "categories")} · ${plural(t.types, "type")} · ${plural(t.options, "option")} · ${t.registered} registered`,
  propertiesTitle: "Properties",
  propertiesLead:
    "Every property and its values in Sanity: which types declare it, and how many options and products state each value. Read-only — edit in Studio.",
  propertyTotals: (t: { properties: number; values: number; registered: number }) =>
    `${plural(t.properties, "property", "properties")} · ${plural(t.values, "value")} · ${t.registered} registered`,
  filterCustomizations: "Filter — a category, type, option or registry code…",
  filterProperties: "Filter — a property, a value or a registry code…",
  noMatch: (q: string) => `Nothing matches “${q}”.`,
  optionsShown: (n: number) => `${plural(n, "option")} shown`,
  typesCount: (n: number) => plural(n, "type"),
  optionsCount: (n: number) => plural(n, "option"),
  valuesCount: (n: number) => plural(n, "value"),
  propertiesCount: (n: number) => plural(n, "property", "properties"),
  declaredProperties: (n: number) => `${plural(n, "property", "properties")} declared`,
  declaredOnTypes: (n: number) => (n ? `declared on ${plural(n, "type")}` : "not declared on a type"),
  onProducts: (n: number) => `on ${plural(n, "product")}`,
  declaredOn: "Declared on",
  decidedBy: (by: string) => (by === "product" ? "the product decides" : by === "customization" ? "options decide" : by),
  selects: (s: string) => (s === "one" ? "customer picks one" : s === "many" ? "customer picks many" : s),
  status: (s: string) => STATUS_LABEL[s] ?? s,
  usage: (u: string) => USAGE_LABEL[u] ?? u,
  kindOf: (t: string) => `kind of ${t}`,
  noOptions: "No options.",
  noValues: "No values.",
  notRegistered: "not registered",
  editTypeInStudio: "Edit type in Studio",
  columns: { value: "Value", code: "Registry ID", facts: "Facts", options: "Options", products: "Products" },
};
