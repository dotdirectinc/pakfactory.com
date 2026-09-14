/**
 * Shelf stubs + reserved ops indexes (ADR-018 § extension rule + amendments).
 * Customers / Specs are UI stubs until modules land — do not invent ad-hoc indexes.
 */

import {
  ADMIN_CUSTOMERS_INDEX,
  ADMIN_SPECS_INDEX,
} from "./request-record";
import type { AdminSearchScope } from "./types";

export const SHELF_STUBS = {
  customers: {
    railId: "customers" as const,
    label: "Customers",
    status: "stub" as const,
    /** Reserved Algolia index name — not created until PROD-2357 / follow-up ADR. */
    reservedIndex: ADMIN_CUSTOMERS_INDEX,
    emptyMessage:
      "Customers module is coming soon. Search by company or email under Requests.",
    ticketHint: "PROD-2357 / pakhub-internal",
  },
  specs: {
    railId: "specs" as const,
    label: "Specs",
    status: "stub" as const,
    reservedIndex: ADMIN_SPECS_INDEX,
    emptyMessage:
      "Operational specs are not searchable yet. Use Products for catalog packaging.",
    ticketHint: "Future spec_instance / request-line specs",
  },
} as const;

export type ShelfStubId = keyof typeof SHELF_STUBS;

/**
 * Checklist before promoting a stub to a live searchable type (ADR-018 §8).
 */
export const SHELF_EXTENSION_CHECKLIST = [
  "Record mapper + index settings (ops → admin_*, content → content_*)",
  "Sync path (webhook / Function / job) or explicit static ownership",
  "Rail scope or documented All-only behaviour",
  "BFF section + ranking rules in runAdminSearch",
  "ADR-018 amendment or superseding ADR",
] as const;

export function shelfStubForScope(scope: AdminSearchScope) {
  if (scope === "customers") return SHELF_STUBS.customers;
  if (scope === "specs") return SHELF_STUBS.specs;
  return null;
}
