import type { Request } from "@pakfactory/domain/request";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

/**
 * Admin request lifecycle statuses. Extend as product adds quoted / closed / etc.
 * Domain does not expose status yet — `getRequestStatus` is a stub until it does.
 */
export type RequestStatus = "submitted";

const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: ADMIN_REQUESTS_COPY.statusSubmitted,
};

const REQUEST_STATUS_CHIP_CLASS: Record<RequestStatus, string> = {
  submitted: "border-transparent bg-primary/10 text-primary",
};

const REQUEST_STATUS_DOT_CLASS: Record<RequestStatus, string> = {
  submitted: "bg-primary",
};

export function requestStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUS_LABELS[status];
}

export function requestStatusChipClass(status: RequestStatus): string {
  return REQUEST_STATUS_CHIP_CLASS[status];
}

export function requestStatusDotClass(status: RequestStatus): string {
  return REQUEST_STATUS_DOT_CLASS[status];
}

/** Stub until `@pakfactory/domain` carries a real status field. */
export function getRequestStatus(_request: Request): RequestStatus {
  return "submitted";
}
