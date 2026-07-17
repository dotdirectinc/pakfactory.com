import type { ProfilePageInput } from "../types";

/**
 * ProfilePage — the page-level wrapper for an author/person profile. Its
 * `mainEntity` references the Person node by `@id` (kept in the same @graph),
 * so crawlers read the page as a profile of that person (PROD-2120).
 */
export function profilePage(input: ProfilePageInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "ProfilePage",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.mainEntity) doc.mainEntity = input.mainEntity;
  if (input.description) doc.description = input.description;
  if (input.dateModified) doc.dateModified = input.dateModified;
  if (input.breadcrumb) doc.breadcrumb = input.breadcrumb;
  return doc;
}
