/**
 * Front-end mirror of the tag axis vocabulary defined in
 * `apps/studio/schemas/blogTag.ts` (`TAG_GROUPS` + `TAG_GROUP_UNGROUPED`).
 * Apps must not import from `apps/studio`, so the ordered value→title list is
 * duplicated here — keep it in sync with Studio (same pattern as
 * `BLOG_CATEGORY_FALLBACK` mirroring `blogCategory` validation). Used for the
 * tag-page kicker label and to group / hide axes in the tag sidebar (PROD-1500).
 */
export const TAG_GROUP_UNGROUPED = "ungrouped" as const;

/** Ordered axis vocabulary — display order matches Studio `TAG_GROUPS`. */
export const TAG_GROUPS = [
  { value: "material", title: "Material" },
  { value: "packaging-type", title: "Packaging Type" },
  { value: "finish", title: "Finish" },
  { value: "industry", title: "Industry" },
] as const;

const TAG_GROUP_TITLES: Record<string, string> = Object.fromEntries(
  TAG_GROUPS.map((g) => [g.value, g.title]),
);

/** Human label for a tag axis, or undefined when ungrouped / unknown. */
export function tagGroupTitle(tagGroup?: string): string | undefined {
  if (!tagGroup || tagGroup === TAG_GROUP_UNGROUPED) return undefined;
  return TAG_GROUP_TITLES[tagGroup];
}
