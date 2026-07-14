"use client";

import { useEffect } from "react";
import {
  consumePaginationScrollIntent,
  scrollToPaginationTarget,
  setPaginationScrollIntent,
} from "@pakfactory/components/commons/path-pagination";

export { setPaginationScrollIntent };

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
    scrollToPaginationTarget(targetId);
  }, [targetId, pageNumber]);

  return null;
}
