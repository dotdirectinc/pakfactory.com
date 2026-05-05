import type { JsonLdDocument } from "./types";
import { SCHEMA_CONTEXT } from "./types";

/**
 * Wrap multiple nodes as a single JSON-LD document with @graph.
 */
export function jsonLdGraph(nodes: readonly Record<string, unknown>[]): JsonLdDocument {
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [...nodes],
  };
}

/**
 * Serialize for safe embedding in `<script type="application/ld+json">`.
 * Escapes `<` so `</script>` cannot break out of the tag.
 */
export function serializeJsonLd(doc: JsonLdDocument): string {
  return JSON.stringify(doc).replace(/</g, "\\u003c");
}
