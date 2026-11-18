/** Job specs → Readiness. */
export const ADMIN_SPEC_READINESS_COPY = {
  title: "Readiness",
  lead: "Whether a job spec could be built from each website spec using approved data only: its map approved (Mapping review) and every production record the map uses approved (Library review). A job spec is released to a vendor only when everything it uses is approved. Read-only.",
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
  openMap: "Open in Mapping review",
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
    "Only website specs loaded into Mapping review are listed. A record nobody has decided counts as not approved.",
} as const;
