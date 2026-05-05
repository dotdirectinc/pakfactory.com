import type { PersonInput } from "../types";

export function person(input: PersonInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "Person",
    name: input.name,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.url) doc.url = input.url;
  if (input.image) doc.image = input.image;
  return doc;
}
