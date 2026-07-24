"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { setPaginationScrollIntent } from "../commons/path-pagination";

type PaginationLinkProps = ComponentProps<typeof Link>;

/**
 * A pagination `<Link>` that suppresses the browser's default scroll-to-top and
 * records a scroll-intent flag on click, so `PaginationScroll` can smooth-scroll
 * to the listing anchor after the (full) navigation completes. Generic: the
 * caller decides the target via `PaginationScroll`'s `targetId` — no feature or
 * route coupling here.
 */
export function PaginationLink({ onClick, ...props }: PaginationLinkProps) {
  return (
    <Link
      scroll={false}
      onClick={(event) => {
        setPaginationScrollIntent();
        onClick?.(event);
      }}
      {...props}
    />
  );
}
