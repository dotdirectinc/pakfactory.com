"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/** A spinner inside the tab while its page is on the way — feedback the moment it is clicked. */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span aria-hidden className="ml-1.5 inline-block size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground align-[-1px]" />
  ) : null;
}

/** One of the Registry's tabs (PROD-3115). */
export function RegistryTabLink({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`-mb-px border-b-2 px-3 py-2 text-sm ${current ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {children}
      <Pending />
    </Link>
  );
}
