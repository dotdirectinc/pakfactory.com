import type { CollectionPageInput } from "../types";

export function collectionPage(input: CollectionPageInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "CollectionPage",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.description) doc.description = input.description;
  return doc;
}
