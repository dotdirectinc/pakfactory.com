"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import type { TocEntry } from "@/lib/post-toc";

type PostTableOfContentsProps = {
  entries: TocEntry[];
};

const MAX_HEIGHT_PX = 264;

export function PostTableOfContents({ entries }: PostTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);
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

  // Keep the active item centered within the scrollable TOC.
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const nav = navRef.current;
    const link = nav.querySelector<HTMLElement>(`[data-toc-id="${activeId}"]`);
    if (!link) return;
    const offsetWithinNav =
      link.getBoundingClientRect().top -
      nav.getBoundingClientRect().top +
      nav.scrollTop;
    const target = offsetWithinNav - nav.clientHeight / 2 + link.clientHeight / 2;
    nav.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [activeId]);

  function handleTocClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    setActiveId(id);
    const heading = document.getElementById(id);
    if (heading) {
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    history.pushState(null, "", `#${id}`);
  }

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Jump to section
      </p>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-background to-transparent" />
        <nav
          ref={navRef}
          aria-label="Table of contents"
          style={{ maxHeight: MAX_HEIGHT_PX }}
          className="overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        >
          <ol className="flex flex-col gap-0.5">
            {entries.map((entry) => {
              const isActive = activeId === entry.id;
              return (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    data-toc-id={entry.id}
                    aria-current={isActive ? "location" : undefined}
                    onClick={(event) => handleTocClick(event, entry.id)}
                    className={cn(
                      "block rounded-lg px-3 py-1.5 text-sm leading-5 transition-colors",
                      isActive
                        ? "bg-[var(--opacity-primary-10)] font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {entry.text}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
