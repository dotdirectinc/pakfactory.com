import type { OrganizationInput } from "../types";

export function organization(input: OrganizationInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "Organization",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.logo) doc.logo = input.logo;
  if (input.sameAs?.length) doc.sameAs = [...input.sameAs];
  return doc;
}
