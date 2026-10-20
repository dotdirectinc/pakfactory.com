"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import { ADMIN_UI_COPY as COPY } from "@/lib/copy/ui";

/**
 * A page's description, held to two lines so the page's own work (the map, the tables) starts high
 * on the screen. "Read more" shows only when the text is longer than that. Once opened it closes
 * again as soon as the reader moves on — scrolls anywhere (the page or a panel inside it), clicks or
 * tabs somewhere else — so it never stays pushing the page down.
 */
export function PageLead({ children, className }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [longer, setLonger] = useState(false);

  // Whether the text runs past two lines — measured while clamped, again whenever its width changes.
  useLayoutEffect(() => {
    const el = text.current;
    if (!el || open) return;
    const measure = () => setLonger(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => !(e.target instanceof Node && box.current?.contains(e.target));
    const onPointer = (e: Event) => { if (outside(e)) setOpen(false); };
    // Scroll events do not bubble; listening in the capture phase also hears panels that scroll on
    // their own (the Spec Map). The layout settling right after opening is not the reader moving on.
    let armed = false;
    const arm = window.setTimeout(() => { armed = true; }, 200);
    const onScroll = () => { if (armed) setOpen(false); };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("focusin", onPointer, true);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      window.clearTimeout(arm);
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("focusin", onPointer, true);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <div ref={box} data-page-lead className={cn("flex max-w-3xl flex-col items-start gap-0.5", className)}>
      <p ref={text} className={cn("text-sm text-muted-foreground", !open && "line-clamp-2")}>
        {children}
      </p>
      {longer || open ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          {open ? COPY.showLess : COPY.readMore}
        </button>
      ) : null}
    </div>
  );
}
