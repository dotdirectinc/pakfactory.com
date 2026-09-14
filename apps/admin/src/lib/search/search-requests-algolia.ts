import {
  ADMIN_REQUESTS_INDEX,
  type AdminRequestAlgoliaRecord,
} from "./request-record";
import {
  getAlgoliaSearchClient,
  isAlgoliaSearchConfigured,
} from "./algolia-client";
import type { AdminSearchHit } from "./types";

/**
 * Owner-scoped Algolia search for requests (ADR-018).
 * Filter is applied server-side — never trust the client for assignee scope.
 */
export async function searchRequestsViaAlgolia(input: {
  query: string;
  assignedOwnerCrmId: string;
  limit?: number;
}): Promise<{ hits: AdminSearchHit[]; available: boolean }> {
  const { query, assignedOwnerCrmId, limit = 8 } = input;
  if (!assignedOwnerCrmId || !isAlgoliaSearchConfigured()) {
    return { hits: [], available: false };
  }

  const client = getAlgoliaSearchClient();
  if (!client) return { hits: [], available: false };

  const q = query.trim();
  const { results } = await client.search({
    requests: [
      {
        indexName: ADMIN_REQUESTS_INDEX,
        query: q,
        hitsPerPage: limit,
        filters: `assignedOwnerCrmId:${JSON.stringify(assignedOwnerCrmId)}`,
      },
    ],
  });

  const first = results[0];
  if (!first || !("hits" in first)) {
    return { hits: [], available: true };
  }

  const hits = (first.hits as AdminRequestAlgoliaRecord[]).map((record) => ({
    id: record.objectID,
    kind: "request" as const,
    title: record.ref || record.objectID,
    subtitle: [
      record.contactCompany,
      record.contactEmail,
      record.submittedAt
        ? new Date(record.submittedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
    href: `/requests/${record.objectID}`,
    badge: record.entryKind,
  }));

  return { hits, available: true };
}
