"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { RequestSummary } from "@pakfactory/domain/request";
import { Badge } from "@pakfactory/ui/components/badge";
import { Input } from "@pakfactory/ui/components/input";
import { cn } from "@pakfactory/ui/lib/utils";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";
import { entryKindLabel } from "@/lib/request-entry-kind";

type RequestListProps = {
  requests: RequestSummary[];
};

function formatSubmittedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return ADMIN_REQUESTS_COPY.emptyValue;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function matchesListQuery(summary: RequestSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    summary.ref,
    summary.id,
    summary.contactName,
    summary.contactCompany,
    summary.contactEmail,
    summary.contactIndustry,
    summary.timeline,
    summary.entryKind,
    entryKindLabel(summary.entryKind),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function RequestList({ requests }: RequestListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => requests.filter((request) => matchesListQuery(request, query)),
    [requests, query],
  );

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ADMIN_REQUESTS_COPY.emptyList}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <span
          className={cn(
            "rounded-md px-2 py-1 text-sm font-medium",
            "bg-muted text-foreground",
          )}
        >
          {ADMIN_REQUESTS_COPY.listTabAll}
        </span>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ADMIN_REQUESTS_COPY.listSearchPlaceholder}
            aria-label={ADMIN_REQUESTS_COPY.listSearchLabel}
            className="h-8 border-0 bg-transparent pl-8 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2 font-medium">
                  {ADMIN_REQUESTS_COPY.listColRfq}
                </th>
                <th className="px-4 py-2 font-medium">
                  {ADMIN_REQUESTS_COPY.listColSubmitted}
                </th>
                <th className="px-4 py-2 font-medium">
                  {ADMIN_REQUESTS_COPY.listColCustomer}
                </th>
                <th className="px-4 py-2 font-medium">
                  {ADMIN_REQUESTS_COPY.listColType}
                </th>
                <th className="px-4 py-2 text-right font-medium tabular-nums">
                  {ADMIN_REQUESTS_COPY.listColItems}
                </th>
                <th className="px-4 py-2 font-medium">
                  {ADMIN_REQUESTS_COPY.listColTimeline}
                </th>
                <th className="px-4 py-2 font-medium">
                  {ADMIN_REQUESTS_COPY.listColIndustry}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {ADMIN_REQUESTS_COPY.emptySearch}
                  </td>
                </tr>
              ) : (
                filtered.map((request) => {
                  const href = `/requests/${request.id}`;
                  const rfq = request.ref?.trim() || request.id;
                  return (
                    <tr
                      key={request.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={href}
                          className="font-medium text-foreground hover:underline"
                        >
                          {rfq}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                        <Link href={href} className="block">
                          {formatSubmittedAt(request.submittedAt)}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={href} className="block min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {request.contactName ||
                              ADMIN_REQUESTS_COPY.emptyValue}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {request.contactCompany ||
                              ADMIN_REQUESTS_COPY.emptyValue}
                            {request.contactEmail
                              ? ` · ${request.contactEmail}`
                              : null}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={href} className="inline-flex">
                          <Badge
                            variant="secondary"
                            className="rounded-md font-normal text-muted-foreground"
                          >
                            {entryKindLabel(request.entryKind)}
                          </Badge>
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        <Link href={href} className="block">
                          {request.lineCount}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        <Link href={href} className="block truncate">
                          {request.timeline.trim() ||
                            ADMIN_REQUESTS_COPY.emptyValue}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        <Link href={href} className="block truncate">
                          {request.contactIndustry.trim() ||
                            ADMIN_REQUESTS_COPY.emptyValue}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
