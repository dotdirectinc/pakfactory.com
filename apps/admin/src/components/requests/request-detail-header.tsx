import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import type { Request } from "@pakfactory/request/request";
import { Badge } from "@pakfactory/ui/components/badge";
import { cn } from "@pakfactory/ui/lib/utils";
import { ComingSoonButton } from "@/components/requests/coming-soon-button";
import { RequestPreviewDrawer } from "@/components/requests/request-preview-drawer";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";
import {
  getRequestStatus,
  requestStatusChipClass,
  requestStatusDotClass,
  requestStatusLabel,
} from "@/lib/request-status";

type RequestDetailHeaderProps = {
  request: Request;
  preview: ReactNode;
};

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RequestDetailHeader({
  request,
  preview,
}: RequestDetailHeaderProps) {
  const { draft } = request;
  const displayRef = draft.ref ?? request.id;
  const company = draft.contactCompany.trim();
  const status = getRequestStatus(request);
  const statusLabel = requestStatusLabel(status);

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href="/requests"
            aria-label={ADMIN_REQUESTS_COPY.breadcrumbRequests}
            className="flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <FileText className="size-5" aria-hidden />
          </Link>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <h1 className="text-xl font-semibold tracking-tight">{displayRef}</h1>
          <Badge
            variant="secondary"
            className={cn("gap-1.5", requestStatusChipClass(status))}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                requestStatusDotClass(status),
              )}
              aria-hidden
            />
            {statusLabel}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ComingSoonButton label={ADMIN_REQUESTS_COPY.editAction} />
          <RequestPreviewDrawer>{preview}</RequestPreviewDrawer>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {formatSubmittedAt(request.submittedAt)}
        {company
          ? ` ${ADMIN_REQUESTS_COPY.detailMetaFromCompany(company)}`
          : null}
      </p>
    </header>
  );
}
