/** Job specs (menu entry; /spec/readiness). No job specs exist yet: the page shows how close each website spec is to one. */
export const ADMIN_SPEC_READINESS_COPY = {
  title: "Job specs",
  lead: "A job spec is the spec of one customer job, sent to the vendor who makes it. None exist yet. Before one can be built from a website spec, its map and every production record the map uses must be approved (Review → Mapping and Review → Production library). This page shows where each website spec stands. Read-only.",
  unreachable: "The registry API is not reachable",
  lineHeading: "Product line",
  noneLoaded: (line: string) =>
    `No maps have been loaded for ${line} yet, so nothing can be checked.`,
  empty: "No website specs match.",
  all: "All",
  summary: (ready: number, total: number) => `${ready} of ${total} ready`,
  columns: {
    website: "Website spec",
    map: "Map",
    production: "Production records it uses",
    status: "Status",
  },
  approvedOf: (approved: number, total: number) =>
    `${approved} of ${total} approved`,
  noRecords: "None",
  needsCode: (n: number) =>
    n === 1
      ? "1 preset needs a production code"
      : `${n} presets need a production code`,
  openMap: "Open in Review → Mapping",
  noPage: "No catalog page",
  states: {
    pending: "To review",
    approve: "Approved",
    reject: "Rejected",
    defer: "Deferred",
  } as Record<string, string>,
  labels: {
    mapped: "Mapped",
    mapped_with_preset: "Mapped with preset",
    catch_all: "Catch-all",
    no_equivalent: "No equivalent",
  } as Record<string, string>,
  scopeNote:
    "Only website specs whose maps have been loaded are listed. A record nobody has decided counts as not approved.",
} as const;
