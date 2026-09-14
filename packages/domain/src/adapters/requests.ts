import type { Request, RequestSummary } from "../request";

/**
 * Request reads are scoped to one sales member's Zoho id. `null` (a `staff`
 * account, or a sales account with no Zoho mapping) must yield nothing — an
 * adapter never treats a missing scope as "unscoped".
 */
export interface RequestReadAdapter {
  listForSalesMember(zohoUserId: string | null): Promise<RequestSummary[]>;
  getById(id: string, zohoUserId: string | null): Promise<Request | null>;
}
