import type { PersonInput } from "../types";

export function person(input: PersonInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "Person",
    name: input.name,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.url) doc.url = input.url;
  if (input.image) doc.image = input.image;
  if (input.jobTitle) doc.jobTitle = input.jobTitle;
  if (input.description) doc.description = input.description;
  if (input.sameAs?.length) doc.sameAs = [...input.sameAs];
  if (input.worksFor) doc.worksFor = input.worksFor;
  return doc;
}
