import type { RequestSummary } from "@pakfactory/domain/request";
import type { AdminSearchHit } from "./types";

function matchesQuery(summary: RequestSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    summary.ref,
    summary.id,
    summary.contactCompany,
    summary.contactEmail,
    summary.contactName,
    summary.contactIndustry,
    summary.timeline,
    summary.entryKind,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** Stronger matches first (ADR-018 ranking: exact ref / company / email). */
function matchStrength(summary: RequestSummary, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const ref = (summary.ref ?? "").toLowerCase();
  const id = summary.id.toLowerCase();
  const company = (summary.contactCompany ?? "").toLowerCase();
  const email = (summary.contactEmail ?? "").toLowerCase();
  if (ref === q || id === q) return 3;
  if (email === q || company === q) return 2;
  if (ref.startsWith(q) || email.startsWith(q) || company.startsWith(q)) {
    return 1;
  }
  return 0;
}

export function requestSummariesToHits(
  summaries: RequestSummary[],
  query: string,
  limit = 8,
): AdminSearchHit[] {
  return summaries
    .filter((s) => matchesQuery(s, query))
    .sort((a, b) => matchStrength(b, query) - matchStrength(a, query))
    .slice(0, limit)
    .map((summary) => ({
      id: summary.id,
      kind: "request" as const,
      title: summary.ref?.trim() || summary.id,
      subtitle: [
        summary.contactCompany,
        summary.contactEmail,
        new Date(summary.submittedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/requests/${summary.id}`,
      badge: summary.entryKind,
    }));
}
