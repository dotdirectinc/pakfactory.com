export const ADMIN_SPEC_COPY = {
  listTitle: "Spec registry",
  listLead:
    "Changes to the spec registry: rule edits from the Spec System, and changes found by Sync Changes (Sanity) and Sync Notion. Nothing here is live until it is approved.",
  editsTitle: "Recent Spec System edits",
  editsLead: "Rule edits made on the Catalog and the Map, newest first — waiting, approved or discarded.",
  editsMore: (n: number) => (n === 1 ? "and 1 more change" : `and ${n} more changes`),
  editsOpen: "Open",
  editsState: { draft: "Waiting", approved: "Approved", discarded: "Discarded", superseded: "Superseded" } as Record<string, string>,
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
  approveStillRunning:
    "The approval is taking longer than expected and may still go through. Don't approve again — this page shows the outcome when it lands; if nothing changes, reload in a few minutes.",
  discarding: "Discarding…",
  discardConfirm:
    "Discard this frame? It cannot be undone, and reloading it means re-running the generator.",
  discardYes: "Yes, discard",
  readOnlyNote:
    "You can review this frame but not decide it — that needs the approver role.",
  decidedNote: "This frame has already been decided.",
  resync: "Re-sync",
  resyncing: "Re-syncing…",
  resyncStarted: "Sync started — the newest changes replace this frame when it finishes.",
  resyncHint:
    "Reruns the sync that made this frame. Its pending frames are replaced with the newest values; undecided changes come back.",
  supersededNote:
    "A newer sync replaced this frame. Its undecided changes — at their newest values — are in the frame that replaced it.",
  newSinceLastSync: "New since last sync",
  exclude: "Exclude",
  include: "Include",
  excludedNote: "Excluded — not applied when the frame is approved",
  excludeHint:
    "Exclude leaves a record out of this approval — all of its rows here together. It will be proposed again only if its source changes again.",
  allExcluded: "Every change is excluded — include at least one, or discard the frame.",
  /** A "Deleted in Sanity" frame (PROD-3141): approve, excluding any record to keep; it cannot be discarded. */
  deletionAllExcluded: "Every record is excluded — approving records that they stay live.",
  deletionNoDiscard:
    "Records deleted in Sanity: approve to retire them, or exclude a record to keep it live. This frame cannot be discarded — that would hide a real deletion.",
  /** "What this changes" group labels that read better than "<op> <table>". */
  groupLabels: { "insert entity_tombstone": "records deleted in Sanity — retire" } as Record<string, string>,
  sanityWriteNote:
    "Its Sanity changes are written right after approval — each row then shows Written, or why it was not; problems also appear in the Sync panel.",
  blockedLead:
    "This frame refers to rows other frames create, so it cannot be approved yet. Approve these first:",
  unreachable:
    "The registry API is not reachable, so pending changes cannot be listed.",
} as const;

/** Current rules (PROD-2560): read from Sanity, computed by the shared rules package. */
export const ADMIN_SPEC_RULES_COPY = {
  title: "Spec rules",
  lead:
    "What the rules say right now, computed by the same code the storefront and Studio use. To change a rule, open its record (\"edit\" on any row) — or select it on the Map — and use Edit rules; approved changes show here on the next load.",
  edit: "edit",
  editTitle: (name: string) => `Edit the rules of ${name}`,
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
  sku: "SKU",
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
  notActiveNote: "Not active — hidden on the site",
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

/** Sync Sanity (PROD-2751): propose registry changes from what Studio holds. */
/** Who edits the catalog relations — the Spec System or Studio (PROD-2988 / PROD-3008). */
export const ADMIN_SPEC_OWNER_COPY = {
  title: "Who edits catalog relations",
  lead: (dataset: string) =>
    `Customization rules and a registered record's parents are edited in one place at a time. "Spec System": read-only in Studio, edited and approved here. "Studio": editable in Studio as before, and Sync Changes brings Studio's edits here. Dataset: ${dataset}.`,
  rules: "Customization rules",
  structure: "Parents (registered records)",
  spec: "Spec System",
  studio: "Studio",
  never: "Never switched — Studio edits both.",
  changed: (who: string) => `Last changed by ${who}`,
  adminOnly: "Only admins can change this.",
  change: "Change…",
  note: "Why (optional, kept with the change)",
  confirmTitle: "Change who edits catalog relations?",
  confirmBody: (rules: string, structure: string) =>
    `Rules: ${rules}. Parents: ${structure}. Studio editors see it after they reload Studio; Sync Changes follows on its next run.`,
  apply: "Apply…",
  confirm: "Yes, change it",
  cancel: "Cancel",
  saving: "Changing…",
  done: "Changed. Ask editors to reload Studio.",
  unreachable: "Could not read who edits catalog relations.",
} as const;

export const ADMIN_SPEC_SYNC_COPY = {
  title: "Sync",
  lead:
    "Compare the website's catalog with the spec registry. Differences arrive as frames in the list below — nothing changes until a frame is approved.",
  datasetLabel: "Dataset",
  datasets: [
    { value: "development", label: "Development", enabled: true },
    { value: "production", label: "Production (after its catalog rebuild)", enabled: false },
  ],
  button: "Sync Changes",
  requesting: "Requesting…",
  includeSku: "Include SKUs",
  includeSkuHint:
    "Also propose SKUs that replace a TMP- placeholder, in their own frame. Approving that frame is permanent: the registry refuses any later SKU change.",
  open: "A sync is in progress. This page updates when it finishes.",
  noPermission: "Starting a sync needs the approver role.",
  recent: "Recent syncs",
  none: "No syncs yet.",
  // A content sync is an admin's tool (account menu); its runs still show here, named neutrally.
  kinds: { sanity: "Changes", notion: "Content" },
  states: { requested: "Queued", running: "Running", done: "Done", failed: "Failed" },
  // A run reads Sanity only after an approval's writes land, or it would propose undoing them (2026-10-26).
  waitingOnWrites: (n: number) => `Waiting for an approval's Sanity writes to finish (${n.toLocaleString()} left) — starts right after.`,
  nothingFound: "No differences — nothing to approve.",
  // The shell's watcher, when a run this tab started ends (2026-10-21).
  finished: (kind: string, frames: number, items: number) =>
    `${kind} finished — ${frames} ${frames === 1 ? "frame" : "frames"} to approve (${items} ${items === 1 ? "change" : "changes"}).`,
  finishedNothing: (kind: string) => `${kind} finished — no differences, nothing to approve.`,
  finishedFailed: (kind: string) => `${kind} failed.`,
  finishedView: "Open Registry",
  finishedNames: { sanity: "Sync Changes", notion: "Sync from Notion" },
  automatic: "Automatic",
  automaticHint: "Started by the system because a catalog record was published in Sanity.",
  skipped: "Skipped — frames were waiting for review. It runs again once they are decided.",
  dismiss: "Dismiss",
  problemsTitle: (n: number) => `${n} approved ${n === 1 ? "change was" : "changes were"} not written to Sanity`,
  problemsLead:
    "They are not counted as decided: run the same sync again and they are proposed again, with current values.",
  problemStates: {
    stale: "changed in Sanity since it was proposed — not overwritten",
    failed: "the write failed",
    stuck: "still waiting to be written",
  },
  dismissing: "Dismissing…",
} as const;

/** The Spec registry page (PROD-3115): what needs a decision first, then problems, then recent activity. */
export const ADMIN_SPEC_REGISTRY_COPY = {
  lead: "Every change to the spec registry arrives here as a frame. Nothing is live until a frame is approved.",
  tabs: { overview: "Overview", history: "Edit history", settings: "Settings" },
  allSyncs: "All syncs",
  waitingTitle: "Waiting for review",
  waitingNone: "Nothing is waiting for review.",
  // Automatic syncs load nothing while a sync frame waits (PROD-3203, 2026-10-28).
  syncPaused: (dataset: string, skipped: number) =>
    `Automatic syncs are paused on ${dataset}: ${skipped.toLocaleString()} skipped since`,
  syncPausedLead:
    "A sync frame is waiting for review, so changes made in Sanity since then are not picked up. Approve or discard the waiting sync frames, or run Sync Changes to load everything now.",
  attentionTitle: "Needs attention",
  syncFailed: (kind: string) => `${kind} sync failed`,
  recentTitle: "Recent activity",
  recentSyncs: "Latest syncs",
  recentApproved: "Recently approved",
  noneApproved: "Nothing approved yet.",
  frame: "Frame",
  source: "From",
  changes: "Changes",
  status: "Status",
  ready: "Ready to review",
  after: (frames: string) => `After ${frames}`,
  review: "Review",
  sources: {
    "sanity-sync": "Sync (Sanity)",
    "notion-sync": "Sync (Notion)",
    "spec-edit": "Spec System edit",
    "registry-rebuild": "Registry rebuild",
    relations: "Relations",
  } as Record<string, string>,
  frames: (n: number) => `${n} ${n === 1 ? "frame" : "frames"}`,
  approvedAt: "Approved",
  sectionError: (what: string) => `${what} could not be loaded.`,
  loadingWaiting: "Loading frames waiting for review…",
  loadingRecent: "Loading the latest syncs and approvals…",
  loadingHistory: "Loading edit history…",
  loadingSettings: "Loading settings…",
  historyMore: "Show more",
  settingsLead: "Settings that change how the Spec System and Studio share the catalog.",
} as const;

/** Catalog tables (PROD-2926): read-only, Notion-like tables of every record type. */
export const ADMIN_SPEC_TABLES_COPY = {
  title: "Catalog",
  lead:
    "Every record type as a table, read from Sanity (the website's catalog) with its registry code. Choose columns, drag a header to move it, use a header's menu to sort or hide. Open a record to edit its customization rules; edit everything else in Studio.",
  level: "Show",
  datasetNote: (dataset: string) => `Sanity dataset: ${dataset}`,
  unreachable: "The table could not be loaded.",
  search: "Search",
  searchPlaceholder: "Search by name, registry code or SKU…",
  status: "Status",
  parent: "Parent",
  any: "Any",
  filter: "Filter",
  clearFilters: "Clear filters",
  removeFilter: (label: string) => `Remove filter ${label}`,
  columns: (shown: number, total: number) => `Columns ${shown}/${total}`,
  shown: "Shown",
  hidden: "Hidden",
  showAll: "Show all",
  hideAll: "Hide all",
  reset: "Reset to default",
  dragHint: "Drag to reorder",
  count: (shown: number, total: number) => (shown === total ? `${total} records` : `${shown} of ${total} records`),
  image: "Image",
  noImage: "No image",
  showOnMap: (title: string) => `Show ${title} on the Spec Map`,
  headerHint: "Drag to move · click for sort and hide",
  sortAsc: "Sort ascending",
  sortDesc: "Sort descending",
  clearSort: "Clear sort",
  hide: "Hide column",
  noMatch: "No records match.",
  untitled: "(untitled)",
  perPage: "Rows per page",
  paginationLabel: "Table pages",
} as const;

/** Planned actions shown greyed out (Richard, 2026-10-15): creating records and rules is phase 2. */
export const ADMIN_SPEC_FUTURE_COPY = {
  tag: "Phase 2",
  title: "Planned for phase 2 — not available yet. Create records in Studio for now.",
  addRule: "Add a new rule",
  addEntity: (entity: string) => `Add a new ${entity}`,
} as const;

/** A catalog record's page (2026-10-08): every record, every level and status. */
/** Spec System → Help: its header, shared with its loading state. */
export const ADMIN_SPEC_HELP_COPY = {
  title: "Spec System help",
  lead:
    "The Spec System is where the catalog's registry is read and where synced changes are approved. The registry holds every product, customization, rule and property with a permanent ID, shared by the website, Sanity, Notion and requests. Names, status and content Sanity owns are copied in automatically; relations change only when someone approves a frame.",
} as const;

export const ADMIN_SPEC_RECORD_COPY = {
  unreachable: "The record could not be loaded.",
  rules: "Rules view",
  showOnMap: "Show on Map",
  showOnMapTitle: "Open the Spec Map on this record: its relations, and where its rules and parents are edited.",
  readOnly: (dataset: string) => `Read-only, from Sanity (${dataset}) — edit in Studio.`,
  /** A record that can be moved (PROD-3007): its parents here, the rest in Studio. */
  movable: (dataset: string) => `From Sanity (${dataset}). Its parents and children change here with Move; everything else in Studio.`,
  rulesEditable: (dataset: string) => `From Sanity (${dataset}). Customization rules are edited below; everything else in Studio.`,
  rulesOnMap: (dataset: string) =>
    `From Sanity (${dataset}). Edit its offers on the map (Edit rules above); its compatible options, type settings and the rest of its rules on its full page; everything else in Studio.`,
  images: (n: number) => `Images (${n})`,
  fields: "All fields",
  /** Changes Sync Changes applied to this record with no frame (PROD-3119). */
  syncChangesTitle: "Changes from Sanity",
  syncChangesLead: "Applied by Sync Changes with no frame — Sanity owns these fields. Newest first.",
  syncChangesNone: "No changes from Sanity applied yet.",
  syncChangesNoRegistry: "Not in the registry yet — changes from Sanity show here once it has a registry id.",
  syncChangesUnreachable: "Its changes from Sanity could not be loaded.",
  loadingSyncChanges: "Loading changes from Sanity…",
  /** A product's SKUs before this one (editors, 2026-10-22): "old → new". */
  skuHistoryTitle: "SKU history",
  skuHistoryLead: "A SKU changes only when the product moves to another line or base. Every SKU it gives up is retired for good.",
  skuHistoryNone: "Its SKU has never changed.",
  skuHistoryUnreachable: "Its SKU history could not be loaded.",
  loadingSkuHistory: "Loading SKU history…",
  skuDeleted: "retired — product deleted",
  added: (v: string) => `Added ${v}`,
  removed: (v: string) => `Removed ${v}`,
  automaticRun: "Automatic sync",
  manualRun: (who: string | null) => `Sync by ${who ?? "someone"}`,
  /** Why some names link and others do not (Richard asked, 2026-10-14). */
  legend:
    "Underlined names open their page in the Spec catalog. Grey names are content with no Spec page (properties, glossary terms, case studies…) — edit them in Studio.",
  noPage: "No Spec page — edit in Studio",
  noPageLabel: "No Spec page:",
  unpublishedLabel: "Not published:",
  unpublished: "This reference points to a document that is not published (draft only or deleted).",
  empty: "—",
  more: (shown: number, total: number) => `First ${shown} of ${total}.`,
} as const;

/** Sync history (PROD-2771): every sync, what it produced, what was decided, and whether it landed. */
export const ADMIN_SPEC_SYNC_HISTORY_COPY = {
  title: "Sync history",
  lead:
    "Every sync, newest first: who started it, the frames it produced and what was decided on each. For an approved frame, the next sync of the same kind re-checks it — whether every field it changed still matches.",
  back: "Registry",
  link: "All syncs and results",
  current: "Current sync",
  past: "Past syncs",
  none: "No syncs yet.",
  unreachable: "The sync history could not be loaded.",
  requestedBy: (name: string) => `by ${name}`,
  someone: "someone",
  documents: (n: number) => `${n} documents read`,
  noFrames: "No differences — nothing to approve.",
  changes: (n: number) => `${n} ${n === 1 ? "change" : "changes"}`,
  excluded: (n: number) => `${n} excluded`,
  frameStates: {
    draft: "Waiting for approval",
    approved: "Approved",
    discarded: "Discarded",
    superseded: "Replaced by a newer sync",
    unknown: "Unknown",
  },
  /** Followed by the time, rendered as <LocalTime>. */
  decidedBy: (verb: string, name: string) => `${verb} by ${name}, `,
  writes: (w: { applied: number; pending: number; stale: number; failed: number }) =>
    [
      `${w.applied} written to Sanity`,
      w.pending ? `${w.pending} waiting` : null,
      w.stale ? `${w.stale} not written (changed in Sanity since)` : null,
      w.failed ? `${w.failed} failed` : null,
    ].filter(Boolean).join(" · "),
  recheckOk: (checked: number) => `Re-checked: all ${checked} ${checked === 1 ? "field" : "fields"} still match`,
  recheckNothing: "Re-checked: nothing to compare (approved before re-checks existed)",
  recheckDiffer: (n: number, checked: number) =>
    `Re-checked: ${n} of ${checked} ${checked === 1 ? "field" : "fields"} no longer match — not written, or changed again since`,
  recheckPending: "Not re-checked yet — the next sync of this kind checks it.",
  recheckError: (e: string) => `This sync could not re-check earlier frames: ${e}`,
  unnamedRow: "a row",
  rulesMatch: "Customization rules: the registry matches Sanity",
  rulesDrift: (total: number, byKind: Record<string, number>) => {
    const label: Record<string, string> = { types: "type settings", requirements: "requirements", pairs: "compatible pairs", offers: "product offers", exceptions: "exceptions" };
    const parts = Object.entries(byKind).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${label[k] ?? k}`);
    return `Customization rules: ${total} ${total === 1 ? "difference" : "differences"} between the registry and Sanity${parts.length ? ` (${parts.join(" · ")})` : ""}`;
  },
  rulesDriftHint:
    "Every rule where the registry and Sanity disagree, including changes waiting for review or discarded. 0 means the registry holds exactly what Sanity holds.",
  /** Structure (PROD-3006/3007): records' parents. */
  structureMatch: "Catalog structure: the registry matches Sanity",
  structureDrift: (total: number, byKind: Record<string, number>) => {
    const parts = Object.entries(byKind).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
    return `Catalog structure: ${total} ${total === 1 ? "parent differs" : "parents differ"} between the registry and Sanity${parts.length ? ` (${parts.join(" · ")})` : ""}`;
  },
  structureDriftHint:
    "Every record whose parents (line, styles, base, solutions, type, category) differ between the registry and Sanity, proposed or not. 0 means they match.",
  /** Content Sanity owns (PROD-3117 / PROD-3118). */
  contentMatch: "Content: the registry matches Sanity",
  contentDrift: (total: number, byKind: Record<string, number>) => {
    const parts = Object.entries(byKind).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
    return `Content: ${total} ${total === 1 ? "difference" : "differences"} when the sync read it${parts.length ? ` (${parts.join(" · ")})` : ""}`;
  },
  contentDriftHint:
    "Names, status, property values, labels, facts, slugs and solution types where the registry differed from Sanity when this sync read them. The sync applies them itself; an inspiration product that differs from its base is only reported.",
  applied: (n: number) => `${n} ${n === 1 ? "change" : "changes"} from Sanity applied automatically`,
  appliedHint: "Sanity owns names, status and content: the sync applies them itself, with no frame. Each one is in the registry's audit trail.",
  appliedFailed: (n: number) => `${n} could not be applied — the next sync tries again`,
  appliedSkipped: (why: string) => `Nothing applied: ${why}`,
  showApplied: "Show the changes",
  hideApplied: "Hide",
  loadingApplied: "Loading the changes…",
  appliedUnreachable: "The changes could not be loaded.",
  appliedMore: (shown: number, total: number) => `Showing ${shown} of ${total}.`,
} as const;

/** Sanity-bound items in a frame (PROD-2751): before → Notion, and how the approved write went. */
export const ADMIN_SPEC_SANITY_ITEM_COPY = {
  /** A written rule edit replaced a Studio change made after it was proposed (ADR-025 § 4, amended 2026-10-13). */
  overrode: (what: string) => `Overrode Studio's value — ${what}. Kept here so it can be put back.`,
  compare: "Compare",
  before: "Sanity now",
  /** The column of what approving writes: Notion's value for a Notion frame; otherwise the frame's own (a rule edit, a registration — 2026-10-22). */
  after: (source: string) => (source === "notion-sync" ? "Notion" : "After approval"),
  formattingOnly: "Same words — only the formatting changes.",
  listToParagraphs: "Same words — only the formatting changes: bulleted list → paragraphs.",
  paragraphsToList: "Same words — only the formatting changes: paragraphs → bulleted list.",
  states: {
    pending: "Writing to Sanity…",
    applied: "Written to Sanity",
    stale: "Not written — changed in Sanity since",
    failed: "Not written — failed",
  },
} as const;

/** Spec Map (PROD-2960): the catalog as a read-only diagram. */
export const ADMIN_SPEC_MAP_COPY = {
  title: "Spec Map",
  /** Moving records (PROD-3007). */
  moveRecords: "Move records",
  /** The edit modes, together and visible (Richard, 2026-10-15: "Move records" was too hidden). */
  editGroup: "Edit",
  editRulesNeedsSelection: "Select a product or an option on the map to edit its rules.",
  editingRulesTitle: "Editing rules",
  editingRulesHow: "Use ⊖ and ⊕ on the cards, or Offer another…. Changes collect below and are reviewed before they apply.",
  movingTitle: "Moving records",
  movingBarHint: "Moving records — drag a card onto its new parent; the moves collect here.",
  movingHow: "Select a card to see where it is now and everywhere it can move — dashed cards are possible parents or children. Drag a card onto its new parent (valid ones outline green), or use Change parents in the panel. Changes collect below and are reviewed before they apply.",
  doneEditing: "Done",
  moveDone: "Done moving",
  moveRecordsTitle:
    "Drag a card onto its new parent in the column to its left: a style onto a line, a product onto a style (it becomes the primary one), an option onto a type, a type onto a category, an inspiration product onto a solution. Moves go in the pending set below, reviewed like rule edits.",
  moveDoneBlocked: "Submit or cancel the pending changes below first.",
  moving: "Moving",
  /** A drop onto where the card already is (Richard, 2026-10-15): greyed, named, nothing made. */
  noChange: "no change",
  makePrimary: "make primary",
  alreadyThere: (child: string, target: string) => `${child} is already under ${target} — nothing to change.`,
  current: "Current",
  dropNotParent: (child: string, target: string) => `${target} is not something ${child} can hang under — drop it on a card in the column to its left.`,
  dropOnSolutionStyle: (child: string, target: string) =>
    `${child} cannot be moved into ${target}: which inspiration products a solution style shows comes from its filter (product lines, styles, keywords), edited in Studio. To change its solutions, drop ${child} on a solution.`,
  dropping: "Reading its current parents…",
  lead:
    "One stream at a time, one column per level, each column its own A–Z list; each header names how its column relates to the one before. Click a card to see only what it is connected to — grouped under what it hangs off and, for products and options, what the rules make them compatible with; hover a card (or pin it) to see its own links, outlined or as lines. Select a product or an option and use Edit rules to change what it offers; open a record's full page for the rest of its rules; everything else in Studio.",
  hint: "Scroll each column on its own · click a card to see what it is connected to · then hover or pin a card to see its own links.",
  linkMode: "Links",
  linkModes: { highlight: "Outline", lines: "Lines" },
  linkModeTitle: {
    highlight: "Hover or pin a card: its links are outlined, and each column counts the ones scrolled out of view",
    lines: "Hover or pin a card: a line runs to each of its links in the next column",
  },
  pin: (title: string) => `Pin ${title}: keep its links marked while you scroll (Esc to unpin)`,
  unpin: (title: string) => `Unpin ${title}`,
  /** A column's linked cards scrolled out of view, above or below; click to scroll to the next. */
  linkedOut: (n: number, dir: "up" | "down") => `${dir === "up" ? "▲" : "▼"} ${n} linked`,
  /** A column header's relation into it, ER-style: "Lines has →" over Styles. */
  relation: (from: string, verb: string) => `${from} ${verb} →`,
  verb: { has: "has", states: "states", declares: "declares", lists: "lists", matches: "matches", offers: "offers" },
  search: "Find by name, registry code or SKU",
  status: "Status",
  allStatuses: "All statuses",
  statusLabel: { active: "Active", "active-internal": "Active (internal)", "not-active": "Not active", other: "Other" },
  onlyRelated: "Only related cards",
  focusedOn: "Showing what is connected to",
  relatedIn: (n: number, stream: string) => `${n} related in ${stream}`,
  clear: "Show everything",
  collapsed: (n: number) => `${n} records — click to show`,
  /** A focused column's group for cards with no parent in an earlier column. */
  otherGroup: "Not under a card to the left",
  /** A derived offer: the options that make it available (the product does not list it). */
  via: (names: string[]) => `via ${names.join(", ")}`,
  derivedWhy: (names: string[]) => `Offered because it is compatible with ${names.join(", ")} — the product does not list it`,
  propertyCard:
    "A property. Standard products state it and options' types declare it; its values sit under it. Properties and their values are edited in Studio.",
  openFullPage: "Open full page",
  panelLabel: "Selected record",
  close: "Close",
  compatible: (n: number) => `${n} compatible record${n === 1 ? "" : "s"}`,
  offered: "Offered customizations",
  offerKind: { listed: "Direct", derived: "Derived by rules", added: "Added by exception", removed: "Removed by exception" },
  offerChip: { listed: "Direct", derived: "Derived", added: "Added", removed: "Removed" },
  offerKinds: "Show offered customizations by kind",
  filterOffers: "Filter options",
  ofTotal: (n: number, total: number) => `${n} of ${total}`,
  otherType: "No type",
  loading: "Loading…",
  notFound: "This record is no longer published.",
  unreachable: "The Spec Map could not be loaded.",
} as const;

/** Rule editing in the Spec System (PROD-2962, ADR-025). */
export const ADMIN_SPEC_RULE_EDIT_COPY = {
  title: "Customization rules",
  edit: "Edit rules",
  closeMoveFirst: "Finish or cancel the move first.",
  loading: "Loading rules…",
  unreachable: "The rules could not be loaded.",
  offers: "Offered options (listed by the product)",
  noOffers: "None listed.",
  exceptions: "Exceptions",
  noExceptions: "No exceptions.",
  compatible: "Compatible with",
  noCompatible: "Compatible with nothing — it is never offered where other customizations decide it.",
  /** Clear availability / Clear compatibility on an option (PROD-3203). */
  offeredBy: (n: number) => (n === 0 ? "No product offers it." : `Offered by ${n} product${n === 1 ? "" : "s"}.`),
  clearAvailability: (n: number) => `Clear availability (${n})`,
  clearCompatibility: (n: number) => `Clear compatibility (${n})`,
  nothingToClear: "Nothing to clear",
  clearAvailabilityHint: "Adds one removal per product that offers it or names it in an exception. Nothing changes until the frame is approved. Afterwards no product refers to it, so Studio can delete it.",
  clearCompatibilityHint: "Adds one removal per option it is compatible with, on both sides. Nothing changes until the frame is approved.",
  requirements: "Depends on (each requirement must be met; any one entry of it meets it)",
  noRequirements: "Depends on nothing.",
  requirement: (n: number) => `Requirement ${n}`,
  removeRequirement: "Remove requirement",
  emptyRequirement: "Empty — add an entry or remove it.",
  decidedByLabel: "Availability decided by",
  decidedBy: { product: "Availability: each product lists these options", customization: "Availability: decided by other customizations" },
  selectsLabel: "Customers pick",
  selects: { one: "Customers pick one", many: "Customers pick several" },
  addOffer: "Add options this product offers — type, then Enter or Tab…",
  /** The picker's first row when several match (2026-10-22): add every match at once. */
  addAll: (n: number, q: string) => `Add all ${n} matching “${q}”`,
  moreMatches: (n: number) => `${n} more — type more to narrow, or Add all`,
  addCompatible: "Add compatible options — type, then Enter or Tab…",
  addRequirement: "Add a requirement (type or category)…",
  addAlternative: "Add an alternative to this requirement…",
  exceptionMode: "Exception",
  modes: { add: "Add", remove: "Remove" },
  exceptionOption: "Option…",
  reason: "Reason (required)",
  addException: "Add exception",
  remove: (title: string) => `Remove ${title}`,
  pending: (n: number) => (n ? `Pending changes (${n})` : "Pending changes"),
  nothingYet: "No changes yet.",
  undo: "Undo",
  impact: "Impact (the storefront's own rules, before and after)",
  checking: "Checking…",
  noProductChange: "No standard product's offer changes.",
  /** Moves (PROD-3007): what the server says each does, and the codes it reissues. */
  moves: "Moves",
  /** New SKUs (backend 20261022200000): a product moving line or base takes a new SKU; the old one is retired for good. */
  skus: "New SKUs",
  skusLead: "A product that moves to another line or base takes a new SKU. Its current SKU is retired for good: no product can ever use it again.",
  skuFor: (name: string, sku: string) => `New SKU for ${name} (now ${sku})`,
  movesNoOffer: "A product's line, styles and solutions are not part of the customization rules: these moves change no product's offer.",
  codes: (n: number) => `${n} ${n === 1 ? "code is" : "codes are"} reissued under the new parent (the registry id never changes; the old code still finds the record):`,
  documents: (n: number) => `${n} Sanity ${n === 1 ? "document is" : "documents are"} written on approval.`,
  totals: (t: { products: number; gained: number; lost: number }) =>
    `${t.products} ${t.products === 1 ? "product changes" : "products change"}: +${t.gained} offered, −${t.lost} no longer offered.`,
  more: (n: number) => `… and ${n} more`,
  acknowledge: "I understand these consequences.",
  note: "Note for the approver (optional)",
  submit: "Submit for approval",
  submitApprove: "Submit & approve",
  submitting: "Submitting…",
  cancel: "Cancel",
  devOnly: "Development dataset. Approved changes are written to the registry, then to Sanity at once.",
  submitted: "Submitted — waiting for approval in Registry.",
  applied: (w: { applied: number; stale: number; failed: number; deferred?: number } | null) =>
    w?.deferred ? `Approved — ${w.deferred} documents are being written to Sanity in the background; the frame shows how many are left.`
    : w ? `Approved and applied — ${w.applied} written to Sanity${w.stale ? `, ${w.stale} not written (changed in Studio since)` : ""}${w.failed ? `, ${w.failed} failed` : ""}.` : "Approved — writing to Sanity shortly.",
  openFrame: "Open the frame",
  frameHeading: "What this frame changes",
  noEffectTitle: (n: number) => (n === 1 ? "This change does nothing for any product" : `${n} changes do nothing for any product`),
  panelTitle: "Editing rules",
  panelEmpty: "Use ⊖ / ⊕ on the cards, or \"Offer another…\" above the map. Each change is listed here with its impact before anything is saved.",
  tabChanges: "Changes",
  tabDetails: "Details",
  closePanel: "Stop editing",
  noEffectKeep: "Keep it anyway (a deliberate record — customers see no difference)",
  refreshing: "Updating after your change…",
  deleteException: (title: string) => `Delete the exception for ${title}`,
  historyTitle: "Recent rule edits",
  historyMore: (n: number) => (n === 1 ? "+1 more" : `+${n} more`),
  historyOpen: "Open",
  /** A rule field (or entry) with a change already waiting for approval (PROD-2962 scope 4). */
  pendingMark: "Pending",
  pendingTitle: (n: number) =>
    `${n === 1 ? "A change to this is" : `${n} changes to this are`} waiting for approval — open the newest. If you change it too, the most recent proposal wins.`,
  pendingEntry: "A change to this entry is waiting for approval",
  reasonFor: (mode: "add" | "remove") => (mode === "add" ? "Why this product can take it (required)" : "Why this product cannot take it (required)"),
  reasonMissing: "no reason yet",
  barLabel: "Pending rule edits",
  editingHint: "Editing rules — use ⊖ / ⊕ on the cards, or \"Offer another…\" above the map.",
  barMoreErrors: (n: number) => `(+${n} more in the panel)`,
  barWarnings: (n: number) => `${n} ${n === 1 ? "consequence" : "consequences"} to accept`,
  mapEdit: "Edit rules",
  addOptionHere: "Offer more options — type, then Enter or Tab…",
  addProductHere: "Offer on more products — name or SKU, then Enter or Tab…",
  /** An edit column's "Show hidden" list (2026-10-22): what the column leaves out, each with a + to add. */
  showHidden: "Show hidden",
  showHiddenTitle: "Also show what this column leaves out, each with a + to add",
  hideHidden: "Hide",
  notOffered: "Not offered — + to offer",
  offerThis: (title: string) => `Offer ${title}`,
  makeThisCompatible: (title: string) => `Make compatible with ${title}`,
  removeHere: (title: string) => `Stop offering ${title}`,
  restoreHere: (title: string) => `Undo — keep ${title}`,
  previewGain: "Gained with your edits",
  previewLose: "Lost with your edits",
  previewChange: (was: string) => `With your edits — was ${was}`,
  offerAgain: (title: string) => `Offer ${title} again — drops the "remove" exception`,
  stopOffering: (title: string) => `Stop offering ${title}`,
  undoPending: (title: string) => `Undo your change to ${title}`,
  staleCard: "This card was out of date — the map is refreshing. Try again in a moment.",
  refreshingMap: "Updating…",
  preselected: "pre-selected",
  offeredOn: "Offered on products",
  compatibleWith: "Compatible with",
  unsavedOnSwitch: (n: number, tab: string) =>
    `${n} unsaved ${n === 1 ? "change" : "changes"} — switching to ${tab} leaves rule editing. Submit them from the panel, or discard them and switch.`,
  discardAndSwitch: "Discard and switch",
  fold: (group: string) => `Fold ${group}`,
  unfold: (group: string) => `Show ${group}`,
  changed: "has a pending change",
  keepEditing: "Keep editing",
  filterCompatible: "Filter compatible options",
  filterProducts: "Filter products",
  noGroup: "Other",
  makeCompatible: "Make compatible with — type, then Enter or Tab…",
  notCompatible: (title: string) => `No longer compatible with ${title}`,
  editingIn: "Editing rules —",
  showPanel: "Show details",
  hidePanel: "Fold details while editing",
  detailsRail: "Details",
  presetBase: (base: string, n: number) => `Offers come from ${base} · ${n} pre-selected — edit there`,
  presetBaseTitle: (base: string) =>
    `An inspiration product offers what ${base} offers; its rules are edited there. Its pre-selections are changed in Studio.`,
  pendingHere: (sentences: string) => `Pending: ${sentences}`,
  exceptionChip: (mode: "add" | "remove") => `exception · ${mode}`,
  asException: "exception, needs a reason",
  noEffect: "(no effect)",
  noEffectWhy: (mode: "add" | "remove") =>
    mode === "add" ? "no effect: the rules already give this option, so it stays under Derived" : "no effect: the rules do not give this option",
  showDetails: "Show details",
  hideDetails: "Hide details",
  notStandard: "Only a standard product's offers can be edited.",
  frameNote: "Note:",
  frameImpact: "Impact when submitted",
  /** The impact re-checked when the frame is reviewed (PROD-2962 scope 3). */
  recheckTitle: "Impact now",
  recheckSame: "Re-checked against the catalog as it is now: the same as when it was submitted.",
  recheckChanged:
    "Re-checked against the catalog as it is now: the impact has changed since it was submitted — other changes have been made since. Approving applies it as shown here, not as it was submitted.",
  recheckErrors: "Approving this now would break the rules:",
  recheckChangedProducts: "Products whose change is different now",
  recheckNoLonger: "No longer affected",
  recheckNewWarnings: "New since it was submitted",
  recheckUnreachable: "The impact could not be re-checked now",
  recheckNothing: "This frame changes no rule that can be re-checked.",
} as const;

/** The frame page, before approving a Spec System edit (ADR-025 § 4, amended 2026-10-13). */
export const ADMIN_SPEC_OVERRIDE_COPY = {
  title: (n: number) => `Approving overrides ${n} ${n === 1 ? "change" : "changes"} made in Studio since this was proposed`,
  lead: "The approved Spec System change wins. Each Studio value below is replaced, and kept on the frame so it can be put back.",
  row: (title: string, field: string) => `${title} — ${field}`,
  now: "In Studio now",
  proposedOver: "When proposed",
  unreachable: "Could not check Studio for changes since this was proposed.",
} as const;

/** A record's parents, and moving it (PROD-3007, ADR-026). */
export const ADMIN_SPEC_PARENTS_COPY = {
  title: "Parents",
  change: "Change parents",
  /** The record page's way in (Richard, 2026-10-15): like Edit rules, then dropdowns. */
  move: "Move",
  closeRulesFirst: "Finish or cancel editing the rules first.",
  titleChildren: (label: string) => label,
  movingHint: "Pick new parents from the dropdowns, or add a record under this one. The moves collect below; nothing changes until they are submitted and approved.",
  pickLine2: "Choose a line",
  pickStyle: "Choose a style",
  pickBase2: "Choose a standard product",
  pickSolution: "Choose a solution",
  pickType2: "Choose a type",
  pickCategory2: "Choose a category",
  addChild: (label: string) => `Add to ${label.toLowerCase()}…`,
  noChildren: "None yet.",
  pendingChild: "pending",
  andMore: (n: number) => `and ${n} more`,
  done: "Done",
  loading: "Loading parents…",
  unreachable: "The parents could not be loaded.",
  hint: "Moves are reviewed like rule edits: they go in the same pending set and frame. Moving a record moves what is under it.",
  readOnly: "Created in Studio with its parents; afterwards they change here, reviewed.",
  line: "Line",
  styles: "Styles",
  base: "Based on",
  solutions: "Solutions",
  /** A solution style's one solution (PROD-3095). */
  solution: "Solution",
  type: "Type",
  category: "Category",
  primary: "primary",
  makePrimary: "Make primary",
  remove: "Remove",
  addStyle: "Add a style of this line…",
  addSolution: "Add a solution…",
  pickLine: "Move to another line…",
  pickBase: "Base it on another standard product…",
  pickType: "Move to another type…",
  pickCategory: "Move to another category…",
  pending: "Pending",
  noStyle: "No style in this line yet — add one.",
  none: "—",
} as const;

/** Sync from Notion — the person picks what Notion owns for this one run (Richard, 2026-10-21). */
export const ADMIN_SPEC_NOTION_SYNC_COPY = {
  title: "Sync from Notion",
  description:
    "Day to day, Studio owns these fields. For this sync, Notion owns the ones you tick: every field where Notion differs from Sanity is proposed — even one approved, excluded or discarded before. Nothing changes until you approve the frames.",
  groups: {
    names: { label: "Names", hint: "Record names." },
    status: { label: "Status", hint: "Active, internal, not active." },
    parents: { label: "Parents", hint: "A product's line, styles, solutions and base; a style's line; an option's type. Not offered once the Spec System edits parents." },
    appearsIn: { label: "Appears in", hint: "Where an option is shown." },
    copy: { label: "Website copy", hint: "Short name, H1, descriptions, short descriptions, meta title and description, benefits." },
    productDetails: { label: "Product details", hint: "MOQ, product kind, dimension input." },
    solutionAxis: { label: "Solution axis", hint: "Industry, use case …" },
    propertiesAdded: { label: "Property values added", hint: "Values Notion adds to a product. Never removes any." },
  },
  all: "All",
  none: "None",
  noneTicked: "Tick at least one group.",
  cancel: "Cancel",
  start: "Start sync",
  starting: "Starting…",
  started: "Notion sync started — you'll see a message here when it finishes.",
} as const;

/** A new option's Register frame, edited before approval (PROD-3167). */
export const ADMIN_SPEC_OPTION_EDIT_COPY = {
  heading: "What this frame changes",
  lead: "Tick or untick a row to change what is approved. Every click is saved for everyone looking at this frame; whoever approves first decides.",
  offeredOn: "Offered on",
  compatibleWith: "Compatible with",
  products: (n: number) => `${n.toLocaleString()} ${n === 1 ? "product" : "products"}`,
  options: (n: number) => `${n.toLocaleString()} ${n === 1 ? "option" : "options"}`,
  search: "Search…",
  show: "Show",
  filters: {
    proposed: "Proposed & edited",
    selected: "Selected",
    differs: "Differs from standard",
    all: "All — to add more",
  },
  noRows: "Nothing matches.",
  noOffers: "Not offered by products directly — other customizations decide it.",
  standard: (share: number | null, n: number) => (share == null || !n ? "standard" : `standard ${Math.round(share * n)}/${n}`),
  studio: "from Studio",
  added: (by: string | null) => (by ? `added by ${by}` : "added"),
  removed: (by: string | null) => (by ? `removed by ${by}` : "removed"),
  saving: "saving…",
  differsHeading: "Differs from standard",
  differsLead: "These rows are the rules once approved — there is no separate exception. A reason is optional and kept with the approval.",
  differsNone: "Nothing differs from the standard set.",
  differsRemoved: "removed",
  differsAdded: "added",
  reason: "Reason (optional)",
  gapsHeading: "Dead combinations",
  gap: (product: string, targets: string) => `${product}: none of its ${targets} options is compatible with this option, so it cannot be configured there.`,
  more: (n: number) => `…and ${n.toLocaleString()} more`,
  editedBy: (who: string, at: string) => `Last edit by ${who}, ${at}.`,
  proposalUpdated: "Proposal updated since these edits — a Sync Changes changed the standard set or Studio's picks. Your edits are kept on top; review before approving.",
  approvedBy: (who: string) => `Approved by ${who}. This frame is closed.`,
  discardedBy: (who: string) => `Discarded by ${who}. This frame is closed.`,
  replaced: "This frame was replaced by a newer Sync Changes — opening the new one…",
  openReplacement: "Open the new frame",
  saveFailed: (error: string) => `Not saved: ${error}`,
  readOnly: "You can view this frame; editing needs approval rights.",
} as const;
