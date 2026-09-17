export const ADMIN_SPEC_COPY = {
  listTitle: "Spec registry",
  listLead:
    "Proposed changes to the spec registry, generated from the content team's board and Notion. Nothing here is live until it is approved.",
  empty: "No changes are waiting for review.",
  emptyHint:
    "Frames appear here when the generator loads them. An approved frame moves out of this list.",
  reviewTitle: "Review frame",
  itemsHeading: "What this changes",
  approve: "Approve frame",
  discard: "Discard",
  approving: "Approving…",
  discarding: "Discarding…",
  readOnlyNote:
    "You can review this frame but not decide it — that needs the approver role.",
  decidedNote: "This frame has already been decided.",
  unreachable:
    "The registry API is not reachable, so pending changes cannot be listed.",
} as const;
