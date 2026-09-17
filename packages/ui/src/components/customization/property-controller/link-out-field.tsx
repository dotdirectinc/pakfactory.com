"use client";

import type { LinkItem } from "../types";

export function LinkOutField({ links }: { links: LinkItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}
