import type { DefinedTermSetInput } from "../types";

/**
 * DefinedTermSet — the glossary itself, the set its terms belong to.
 *
 * ℹ️ Nothing emits this yet: the glossary index is PROD-1826. Ships ahead of its
 * page for the same reason as `definedTerm`.
 *
 * `hasDefinedTerm` normally holds `{ "@id" }` pointers at the term nodes rather
 * than full copies, so a term appearing in both the index and its own page
 * resolves to one entity.
 */
export function definedTermSet(
  input: DefinedTermSetInput,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "DefinedTermSet",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.description) doc.description = input.description;
  if (input.hasDefinedTerm?.length) {
    doc.hasDefinedTerm = [...input.hasDefinedTerm];
  }
  return doc;
}
