"use client";

import { useCallback, useEffect } from "react";
import {
  parsePathPage,
  pathPaginationHref,
  scrollToPaginationTarget,
} from "../commons/path-pagination";

type UsePathPaginationOptions = {
  /** Listing root path, e.g. `/case-studies`. */
  basePath: string;
  /** Current 1-based page (usually the clamped/safe page). */
  page: number;
  /** Update React page state. */
  onPageChange: (page: number) => void;
  /** Element id to scroll into view on page changes. */
  scrollTargetId: string;
};

/**
 * Soft path pagination for client-filtered listings.
 * Uses `history.pushState` so the page component does not remount (filters keep).
 */
export function usePathPagination({
  basePath,
  page,
  onPageChange,
  scrollTargetId,
}: UsePathPaginationOptions) {
  const hrefForPage = useCallback(
    (nextPage: number) => pathPaginationHref(basePath, nextPage),
    [basePath],
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      const target = Math.max(1, Math.floor(nextPage));
      const changed = target !== page;
      if (changed) onPageChange(target);

      const href = pathPaginationHref(basePath, target);
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== href
      ) {
        window.history.pushState(null, "", href);
      }

      if (changed) scrollToPaginationTarget(scrollTargetId);
    },
    [basePath, onPageChange, page, scrollTargetId],
  );

  useEffect(() => {
    const onPopState = () => {
      const parsed = parsePathPage(window.location.pathname, basePath);
      if (parsed == null) return;
      onPageChange(parsed);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [basePath, onPageChange]);

  return { goToPage, hrefForPage };
}
