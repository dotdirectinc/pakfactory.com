"use client";

import type { TocEntry } from "@/lib/post-toc";

type PostStickyGroupProps = {
  toc: TocEntry[];
  children: React.ReactNode;
};

/** Sidebar group that sticks at the top until the article end, then scrolls with the page. */
export function PostStickyGroup({ children }: PostStickyGroupProps) {
  return (
    <div className="flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      {children}
    </div>
  );
}
