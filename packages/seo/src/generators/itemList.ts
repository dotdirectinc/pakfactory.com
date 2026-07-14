import type { ItemListInput } from "../types";

export function itemList(input: ItemListInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "ItemList",
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
  if (input.name) doc.name = input.name;
  if (input.id) doc["@id"] = input.id;
  return doc;
}
