import type { MappingKind } from "@/lib/spec/registry-api";

/** Mapping review (PLAT-52). */
export const ADMIN_SPEC_MAPPING_COPY = {
  title: "Mapping review",
  lead:
    "How each website product, option and property value maps to the production spec, from Terence's mapping draft. Approve, reject or defer each map, or a chosen group at once. Nothing here reaches the website or Sanity.",
  unreachable: "The registry API is not reachable",
  readOnlyNote: "You can read the maps; deciding needs the reviewer role.",
  lineHeading: "Product line",
  progress: (decided: number, total: number) => `${decided} of ${total} decided`,
  labelHeading: "Kind of match",
  allLabels: "All",
  searchPlaceholder: "Search code, name or target",
  search: "Search",
  empty: "No maps match.",
  noneLoaded: (line: string) => `No maps have been loaded for ${line} yet.`,
  groupedBy: (by: string) => `Grouped by ${by}`,
  columns: { item: "Website", maps: "Production", presets: "Presets", draft: "Draft", state: "Decision" },
  confidence: { high: "High confidence", medium: "Medium confidence", low: "Low confidence" } as Record<string, string>,
  needsCode: "needs a code",
  noTarget: "No production record",
  draftSaid: (s: string) => `Draft: ${s}`,
  states: { pending: "To review", approve: "Approved", reject: "Rejected", defer: "Deferred" } as Record<string, string>,
  selectGroup: (n: number) => `Select ${n}`,
  bar: {
    selected: (n: number) => (n === 1 ? "1 map selected" : `${n} maps selected`),
    note: "Note (required to reject or defer)",
    approve: "Approve",
    reject: "Reject",
    defer: "Defer",
    clear: "Clear",
    noteNeeded: "A reject or defer needs a note.",
    done: (n: number, what: string) => (n === 1 ? `1 map ${what}` : `${n} maps ${what}`),
    decided: { approve: "approved", reject: "rejected", defer: "deferred" } as Record<string, string>,
  },
  deciding: "Saving…",
  kindNoun: { product: "products", option: "options", property_value: "property values" } satisfies Record<MappingKind, string>,
};
