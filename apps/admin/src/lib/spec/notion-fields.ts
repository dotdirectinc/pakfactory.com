/**
 * Field groups Sync from Notion can hand to Notion for one run (backend NOTION_FIELD_GROUPS,
 * Richard 2026-10-21). Kept apart from registry-api, which is server-only, so the dialog can use it.
 */
export const NOTION_FIELD_GROUPS = ["names", "status", "parents", "appearsIn", "copy", "productDetails", "solutionAxis", "propertiesAdded"] as const;
export type NotionFieldGroup = (typeof NOTION_FIELD_GROUPS)[number];

/** What Notion proposed before the choice existed — the fields both sides own, and property additions. */
export const DEFAULT_NOTION_FIELD_GROUPS: readonly NotionFieldGroup[] = ["status", "parents", "appearsIn", "propertiesAdded"];
