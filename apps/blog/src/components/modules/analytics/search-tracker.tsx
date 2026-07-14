"use client";

import { useEffect } from "react";

import { captureEvent } from "@/lib/analytics";

/**
 * SearchTracker — fires `search_performed` once per executed query.
 * `zero_results` is the content-gap signal (brain: *blog-analytics-funnels*
 * F3 / Findability). Renders nothing; mounted by the /search page with the
 * server-resolved result count.
 */
type SearchTrackerProps = {
  query: string;
  resultsCount: number;
  page?: number;
};

export function SearchTracker({ query, resultsCount, page }: SearchTrackerProps) {
  useEffect(() => {
    if (!query) return;
    captureEvent("search_performed", {
      query,
      results_count: resultsCount,
      zero_results: resultsCount === 0,
      page: page ?? 1,
    });
  }, [query, resultsCount, page]);

  return null;
}
