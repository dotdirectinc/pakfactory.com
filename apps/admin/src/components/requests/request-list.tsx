import Link from "next/link";
import type { RequestSummary } from "@pakfactory/domain/request";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

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
    <ul className="flex flex-col gap-4">
      {requests.map((request) => (
        <li key={request.id}>
          <Link
            href={`/requests/${request.id}`}
            className="block rounded-md border bg-background p-4 transition-colors hover:bg-muted/50"
          >
            <p className="font-medium">{request.ref ?? request.id}</p>
            <p className="text-sm text-muted-foreground">
              {request.contactCompany} · {request.contactEmail}
            </p>
            <p className="text-xs text-muted-foreground">
              {request.entryKind} · submitted{" "}
              {new Date(request.submittedAt).toLocaleDateString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
