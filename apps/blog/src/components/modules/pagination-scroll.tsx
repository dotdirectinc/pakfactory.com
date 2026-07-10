"use client";

import { useEffect } from "react";

const PAGINATION_SCROLL_INTENT_KEY = "blog:pagination-scroll";

export function setPaginationScrollIntent(): void {
  sessionStorage.setItem(PAGINATION_SCROLL_INTENT_KEY, "1");
}

function consumePaginationScrollIntent(): boolean {
  if (sessionStorage.getItem(PAGINATION_SCROLL_INTENT_KEY) !== "1") return false;
  sessionStorage.removeItem(PAGINATION_SCROLL_INTENT_KEY);
  return true;
}

type PaginationScrollProps = {
  targetId: string;
  pageNumber: number;
};

/** Scrolls the listing anchor into view only after a pagination control click. */
export function PaginationScroll({
  targetId,
  pageNumber,
}: PaginationScrollProps) {
  useEffect(() => {
    if (!consumePaginationScrollIntent()) return;
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [targetId, pageNumber]);

  return null;
}
