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
    const syncFromUrl = () => {
      const parsed = parsePathPage(window.location.pathname, basePath);
      if (parsed == null) return;
      onPageChange(parsed);
    };

    // Sync once on mount. After navigating into a detail page and pressing
    // browser-back, the listing remounts and its `popstate` fires *before* this
    // listener is registered — so a listener alone misses it. The server
    // `initialPage` can also be stale relative to the restored URL (pagination
    // is soft pushState, so the base route may be cached). Reading the actual
    // pathname on mount keeps the displayed page in sync with the URL.
    syncFromUrl();

    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [basePath, onPageChange]);

  // Soft pushState never remounts the route, so generateMetadata does not
  // re-run. Keep the in-DOM canonical / og:url tags aligned with the current
  // page path, preserving the server-emitted origin.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const path = pathPaginationHref(basePath, page);

    const withPagePath = (value: string | null): string | null => {
      if (!value) return null;
      try {
        const url = new URL(value);
        url.pathname = path;
        url.search = "";
        return url.toString();
      } catch {
        return null;
      }
    };

    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (canonical) {
      const next = withPagePath(canonical.href);
      if (next) canonical.href = next;
    }

    const ogUrl = document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]',
    );
    if (ogUrl) {
      const next = withPagePath(ogUrl.content);
      if (next) ogUrl.content = next;
    }
  }, [basePath, page]);

  return { goToPage, hrefForPage };
}
