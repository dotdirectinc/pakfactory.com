import type { RequestEntryKind } from "@pakfactory/domain/request";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

export function entryKindLabel(entryKind: RequestEntryKind): string {
  switch (entryKind) {
    case "express":
      return ADMIN_REQUESTS_COPY.entryKindExpress;
    case "services":
      return ADMIN_REQUESTS_COPY.entryKindServices;
    case "products":
    default:
      return ADMIN_REQUESTS_COPY.entryKindProducts;
  }
}
