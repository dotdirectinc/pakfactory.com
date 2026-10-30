import type { DefinedTermInput } from "../types";

/**
 * DefinedTerm — one glossary entry.
 *
 * ⚠️ `description` must arrive as **plain text**. The `definition` field is
 * Portable Text; flatten it with `pt::text()` in the query, as the blog does for
 * `tldr`, rather than passing blocks here.
 *
 * ℹ️ Nothing emits this yet: `/glossary` does not exist in `apps/www` (PROD-3219).
 * The generator ships ahead of its page deliberately — it is a pure function, so
 * it costs nothing to have ready and can be tested without a route.
 *
 * ℹ️ Produces no visible Google result. Its job is entity disambiguation for
 * search and AI answer engines.
 */
export function definedTerm(input: DefinedTermInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "DefinedTerm",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.description) doc.description = input.description;
  if (input.inDefinedTermSet) doc.inDefinedTermSet = input.inDefinedTermSet;

  const aliases = (input.alternateName ?? [])
    .map((alias) => alias.trim())
    .filter(Boolean);
  if (aliases.length) doc.alternateName = aliases;

  return doc;
}
