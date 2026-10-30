import type { ServiceInput } from "../types";

/**
 * Service — for the Expertise pages, where PakFactory offers a capability
 * rather than a thing a customer buys off a page.
 *
 * `provider` is normally an `{ "@id" }` pointer at the Organization node in the
 * same @graph rather than a second copy of it, so the two resolve to one entity.
 */
export function service(input: ServiceInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "Service",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.description) doc.description = input.description;
  if (input.provider) doc.provider = input.provider;
  if (input.serviceType) doc.serviceType = input.serviceType;
  return doc;
}
