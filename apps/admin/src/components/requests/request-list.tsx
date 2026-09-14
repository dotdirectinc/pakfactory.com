import Link from "next/link";
import type { RequestSummary } from "@pakfactory/domain/request";
import { Badge } from "@pakfactory/ui/components/badge";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";
import { entryKindLabel } from "@/lib/request-entry-kind";

type RequestListProps = {
  requests: RequestSummary[];
};

export function RequestList({ requests }: RequestListProps) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ADMIN_REQUESTS_COPY.emptyList}
      </p>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-background">
      {requests.map((request, index) => (
        <li
          key={request.id}
          className={
            index > 0 ? "border-t border-border" : undefined
          }
        >
          <Link
            href={`/requests/${request.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <span className="min-w-24 font-medium text-foreground">
              {request.ref ?? request.id}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {request.contactCompany || ADMIN_REQUESTS_COPY.emptyValue}
              {request.contactEmail
                ? ` · ${request.contactEmail}`
                : null}
            </span>
            <Badge
              variant="secondary"
              className="rounded-md font-normal text-muted-foreground"
            >
              {entryKindLabel(request.entryKind)}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {new Date(request.submittedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
