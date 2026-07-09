import type { WebPageInput } from "../types";

export function webPage(input: WebPageInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": input.id ?? `${input.url}#webpage`,
    name: input.name,
    url: input.url,
  };
  if (input.description) doc.description = input.description;
  if (input.isPartOf) doc.isPartOf = input.isPartOf;
  return doc;
}
