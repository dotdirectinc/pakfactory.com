import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import type { Request, RequestEntryKind } from "@pakfactory/domain/request";
import { Badge } from "@pakfactory/ui/components/badge";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

type RequestDetailHeaderProps = {
  request: Request;
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

function entryKindLabel(entryKind: RequestEntryKind): string {
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

export function RequestDetailHeader({ request }: RequestDetailHeaderProps) {
  const { draft } = request;
  const displayRef = draft.ref ?? request.id;
  const company = draft.contactCompany.trim();

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href="/requests"
            aria-label={ADMIN_REQUESTS_COPY.breadcrumbRequests}
            className="flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <FileText className="size-5" aria-hidden />
            <ChevronRight className="size-4" aria-hidden />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{displayRef}</h1>
          <Badge variant="secondary" className="rounded-md capitalize">
            {entryKindLabel(draft.entryKind)}
          </Badge>
          <Badge
            variant="secondary"
            className="gap-1.5 rounded-md bg-muted text-muted-foreground"
          >
            <span
              className="size-1.5 shrink-0 rounded-full bg-muted-foreground"
              aria-hidden
            />
            {ADMIN_REQUESTS_COPY.statusSubmitted}
          </Badge>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">
          {ADMIN_REQUESTS_COPY.viewOnlyNotice}
        </p>
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
