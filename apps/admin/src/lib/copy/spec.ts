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
