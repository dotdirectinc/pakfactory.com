import type { OrganizationInput } from "../types";

export function organization(input: OrganizationInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "Organization",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.logo) doc.logo = input.logo;
  if (input.description) doc.description = input.description;
  if (input.foundingDate) doc.foundingDate = input.foundingDate;
  if (input.telephone) doc.telephone = input.telephone;
  if (input.email) doc.email = input.email;
  if (input.address) doc.address = input.address;
  if (input.sameAs?.length) doc.sameAs = [...input.sameAs];
  return doc;
}
