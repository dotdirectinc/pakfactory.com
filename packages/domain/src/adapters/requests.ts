import type { Request, RequestSummary } from "../request";

export interface RequestReadAdapter {
  listForSalesMember(zohoUserId: string): Promise<RequestSummary[]>;
  getById(id: string, zohoUserId: string): Promise<Request | null>;
}
