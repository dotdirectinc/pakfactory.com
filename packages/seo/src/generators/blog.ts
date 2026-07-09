import type { BlogInput } from "../types";

/** schema.org Blog — used on the blog home page. */
export function blog(input: BlogInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "Blog",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.description) doc.description = input.description;
  if (input.publisher) doc.publisher = input.publisher;
  return doc;
}
