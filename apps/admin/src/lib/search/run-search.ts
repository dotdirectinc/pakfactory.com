import type { RequestSummary } from "@pakfactory/domain/request";
import { requestSummariesToHits } from "./filter-requests";
import { filterAdminPages } from "./pages";
import { searchContentCorpus } from "./search-content";
import { searchRequestsViaAlgolia } from "./search-requests-algolia";
import { SHELF_STUBS } from "./shelf";
import { facetLabel, scopeLabel } from "./scopes";
import type {
  AdminSearchFacet,
  AdminSearchHit,
  AdminSearchResponse,
  AdminSearchScope,
  AdminSearchSection,
} from "./types";
import { isNarrowingScope } from "./types";

const STUB_CUSTOMERS = SHELF_STUBS.customers.emptyMessage;
const STUB_SPECS = SHELF_STUBS.specs.emptyMessage;
const CONTENT_UNAVAILABLE =
  "Content search needs Algolia (ALGOLIA_*) or Sanity (NEXT_PUBLIC_SANITY_PROJECT_ID).";

function includeSection(
  scope: AdminSearchScope,
  id: AdminSearchSection["id"],
): boolean {
  if (scope === "all") return true;
  if (scope === "blog") return id === "blog";
  if (scope === "caseStudies") return id === "caseStudies";
  return scope === id;
}

function toFacets(sections: AdminSearchSection[]): AdminSearchFacet[] {
  const facets: AdminSearchFacet[] = [];
  for (const section of sections) {
    if (section.stub) continue;
    if (section.id === "customers" || section.id === "specs") continue;
    const count = section.hits.length;
    if (count === 0) continue;
    const meta = { label: facetLabel(section.id as AdminSearchFacet["id"]) };
    if (!meta.label) continue;
    facets.push({ id: section.id as AdminSearchFacet["id"], label: meta.label, count });
  }
  return facets;
}

export async function runAdminSearch(input: {
  query: string;
  scope: AdminSearchScope;
  requests: RequestSummary[];
  assignedOwnerCrmId: string;
}): Promise<AdminSearchResponse> {
  const query = input.query.trim();
  const { scope, requests, assignedOwnerCrmId } = input;

  // Idle: only need recent requests + pages for the open frame.
  // Scope may still be set from the Mobbin left rail (browse before typing).
  if (!query) {
    if (scope === "customers") {
      return {
        query,
        scope,
        facets: [],
        sections: [
          {
            id: "customers",
            title: SHELF_STUBS.customers.label,
            hits: [],
            stub: true,
            emptyMessage: STUB_CUSTOMERS,
          },
        ],
      };
    }

    if (scope === "specs") {
      return {
        query,
        scope,
        facets: [],
        sections: [
          {
            id: "specs",
            title: SHELF_STUBS.specs.label,
            hits: [],
            stub: true,
            emptyMessage: STUB_SPECS,
          },
        ],
      };
    }

    const recentRequests = [...requests]
      .sort(
        (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
      )
      .slice(0, 6)
      .map((summary) => requestSummariesToHits([summary], "", 1)[0]!)
      .filter(Boolean);

    const pages = filterAdminPages("");

    if (scope === "requests") {
      return {
        query,
        scope,
        facets: [],
        sections: [
          {
            id: "requests",
            title: "Recent requests",
            hits: recentRequests,
          },
        ],
      };
    }

    if (scope === "pages") {
      return {
        query,
        scope,
        facets: [],
        sections: [{ id: "pages", title: "Pages", hits: pages }],
      };
    }

    if (
      scope === "products" ||
      scope === "customizations" ||
      scope === "blog" ||
      scope === "caseStudies"
    ) {
      const label = scopeLabel(scope);
      return {
        query,
        scope,
        facets: [],
        sections: [
          {
            id: scope,
            title: label,
            hits: [],
            emptyMessage: `Start typing to search ${label.toLowerCase()}.`,
          },
        ],
      };
    }

    // scope === "all"
    return {
      query,
      scope,
      facets: [],
      sections: [
        {
          id: "requests",
          title: "Recent requests",
          hits: recentRequests,
        },
        {
          id: "pages",
          title: "Pages",
          hits: pages,
        },
      ],
    };
  }

  // Typing: always score the full corpus so facet pills have accurate counts,
  // then narrow `sections` to the active scope for the result list.
  const [content, algoliaRequests] = await Promise.all([
    searchContentCorpus(query),
    searchRequestsViaAlgolia({
      query,
      assignedOwnerCrmId,
      limit: 8,
    }).catch((error) => {
      console.error("Algolia ops search failed; using adapter filter", error);
      return { hits: [] as AdminSearchHit[], available: false };
    }),
  ]);

  const requestHits = algoliaRequests.available
    ? algoliaRequests.hits
    : requestSummariesToHits(requests, query, 8);

  const allSections: AdminSearchSection[] = [
    {
      id: "requests",
      title: "Requests",
      hits: requestHits,
      emptyMessage: "No requests matched.",
    },
    {
      id: "products",
      title: "Products",
      hits: content.products,
      emptyMessage: content.available
        ? "No products matched."
        : CONTENT_UNAVAILABLE,
    },
    {
      id: "customizations",
      title: "Customizations",
      hits: content.customizations,
      emptyMessage: content.available
        ? "No customizations matched."
        : CONTENT_UNAVAILABLE,
    },
    {
      id: "blog",
      title: "Blog",
      hits: content.posts,
      emptyMessage: content.available
        ? "No posts matched."
        : CONTENT_UNAVAILABLE,
    },
    {
      id: "caseStudies",
      title: "Case studies",
      hits: content.caseStudies,
      emptyMessage: content.available
        ? "No case studies matched."
        : CONTENT_UNAVAILABLE,
    },
    {
      id: "pages",
      title: "Pages",
      hits: filterAdminPages(query),
      emptyMessage: "No pages matched.",
    },
  ];

  const facets = toFacets(allSections);

  if (scope === "customers") {
    return {
      query,
      scope,
      facets,
      sections: [
        {
          id: "customers",
          title: SHELF_STUBS.customers.label,
          hits: [],
          stub: true,
          emptyMessage: STUB_CUSTOMERS,
        },
      ],
    };
  }

  if (scope === "specs") {
    return {
      query,
      scope,
      facets,
      sections: [
        {
          id: "specs",
          title: SHELF_STUBS.specs.label,
          hits: [],
          stub: true,
          emptyMessage: STUB_SPECS,
        },
      ],
    };
  }

  const sections =
    scope === "all"
      ? allSections.filter((s) => s.hits.length > 0)
      : allSections.filter((s) => includeSection(scope, s.id));

  // Scoped empty: keep the empty message so the group label still appears.
  if (isNarrowingScope(scope) && sections.every((s) => s.hits.length === 0)) {
    const empty = allSections.find((s) => s.id === scope);
    return {
      query,
      scope,
      facets,
      sections: empty ? [empty] : [],
    };
  }

  return { query, scope, sections, facets };
}
