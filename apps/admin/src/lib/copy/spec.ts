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
  },
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
  filterOptions: "Filter — an option, a type, a material…",
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
