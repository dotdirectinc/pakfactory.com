"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { setPaginationScrollIntent } from "@/components/modules/pagination-scroll";

type PaginationLinkProps = ComponentProps<typeof Link>;

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
