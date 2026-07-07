"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";
import type { TocEntry } from "@/lib/post-toc";

type PostTableOfContentsProps = {
  entries: TocEntry[];
};

// Collapsed peek height (px). The list is never fully hidden — it keeps a
// minimum, scrollable height; the bottom chevron expands it to a taller,
// viewport-capped list. Keep in sync with the `max-h-[180px]` class below.
const COLLAPSED_MAX_PX = 180;

export function PostTableOfContents({ entries }: PostTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Scroll-spy — highlight the section currently in view.
  useEffect(() => {
    if (entries.length === 0) return;

    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el != null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [entries]);

  // Only offer expand/collapse when the list overflows the collapsed peek.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > COLLAPSED_MAX_PX + 8);
  }, [entries]);

  // Keep the active item visible within the scrollable TOC — scroll only the
  // nav container, never the page.
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const nav = navRef.current;
    const link = nav.querySelector<HTMLElement>(`[data-toc-id="${activeId}"]`);
    if (!link) return;
    const target = link.offsetTop - nav.clientHeight / 2 + link.clientHeight / 2;
    nav.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [activeId]);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-medium text-muted-foreground">
        Table of content
      </p>
      <nav
        ref={navRef}
        aria-label="Table of contents"
        className={cn("overflow-y-auto", open ? "max-h-[55vh]" : "max-h-[180px]")}
      >
        <ol className="flex list-decimal flex-col gap-2 ps-5 marker:text-muted-foreground">
          {entries.map((entry) => {
            const isActive = activeId === entry.id;
            return (
              <li key={entry.id} className={cn(entry.level === 3 && "ms-4")}>
                <a
                  href={`#${entry.id}`}
                  data-toc-id={entry.id}
                  className={cn(
                    "block text-sm leading-6 transition-colors",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {entry.text}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
      {overflowing ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={
            open ? "Collapse table of contents" : "Expand table of contents"
          }
          className="flex w-full cursor-pointer items-center justify-center border-t border-dashed border-border pt-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
