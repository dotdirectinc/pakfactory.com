"use client";

import { useEffect, useState } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import type { TocEntry } from "@/lib/post-toc";

type PostStickyGroupProps = {
  toc: TocEntry[];
  children: React.ReactNode;
};

/** Sticky sidebar group that releases once the user reaches the 4th-from-last TOC section. */
export function PostStickyGroup({ toc, children }: PostStickyGroupProps) {
  const [isSticky, setIsSticky] = useState(true);

  useEffect(() => {
    if (toc.length < 4) return;

    const triggerEntry = toc[toc.length - 4]; // 4th from last
    if (!triggerEntry) return;

    const el = document.getElementById(triggerEntry.id);
    if (!el) return;

    // Fire when the trigger heading crosses the sticky nav offset (top-24 = 96px).
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) {
            setIsSticky(false); // heading entered viewport → unstick
          } else if (record.boundingClientRect.top > 0) {
            setIsSticky(true); // heading is still below viewport → re-stick
          }
          // heading above viewport → stay unstuck (user has scrolled past)
        }
      },
      { rootMargin: "-96px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [toc]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isSticky &&
          "lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto",
      )}
    >
      {children}
    </div>
  );
}
