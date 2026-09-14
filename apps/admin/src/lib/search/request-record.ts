/**
 * Ops corpus — admin_requests Algolia index (ADR-018).
 * Every record MUST include assignedOwnerCrmId for forced BFF filters.
 */

import type { RequestSummary } from "@pakfactory/domain/request";

export const ADMIN_REQUESTS_INDEX = "admin_requests";

/** Reserved for shelf-fill (ADR-018 extension rule) — not synced in V1. */
export const ADMIN_CUSTOMERS_INDEX = "admin_customers";
export const ADMIN_SPECS_INDEX = "admin_specs";

export const ADMIN_REQUESTS_SETTINGS = {
  searchableAttributes: [
    "ref",
    "contactCompany",
    "contactEmail",
    "contactName",
    "entryKind",
    "searchBlob",
  ],
  attributesForFaceting: [
    "filterOnly(assignedOwnerCrmId)",
    "filterOnly(entryKind)",
  ],
  customRanking: ["desc(submittedAtTimestamp)"],
} as const;

export type AdminRequestAlgoliaRecord = {
  objectID: string;
  assignedOwnerCrmId: string;
  ref: string;
  contactCompany: string;
  contactEmail: string;
  contactName: string;
  entryKind: string;
  submittedAt: string;
  submittedAtTimestamp: number;
  /** Concatenated text for broad match (notes / products when available). */
  searchBlob: string;
};

export function toAdminRequestAlgoliaRecord(input: {
  summary: RequestSummary;
  assignedOwnerCrmId: string;
  contactName?: string;
  searchBlob?: string;
}): AdminRequestAlgoliaRecord {
  const { summary, assignedOwnerCrmId } = input;
  if (!assignedOwnerCrmId) {
    throw new Error("assignedOwnerCrmId is required for admin_requests records");
  }
  const contactName = input.contactName ?? summary.contactName ?? "";
  return {
    objectID: summary.id,
    assignedOwnerCrmId,
    ref: summary.ref?.trim() || summary.id,
    contactCompany: summary.contactCompany ?? "",
    contactEmail: summary.contactEmail ?? "",
    contactName,
    entryKind: summary.entryKind,
    submittedAt: summary.submittedAt,
    submittedAtTimestamp: Date.parse(summary.submittedAt) || 0,
    searchBlob: [
      summary.ref,
      summary.id,
      summary.contactCompany,
      summary.contactEmail,
      summary.contactName,
      summary.contactIndustry,
      summary.timeline,
      summary.entryKind,
      contactName,
      input.searchBlob,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
