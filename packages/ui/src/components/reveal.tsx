"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";

/**
 * Reveal — fades/slides a section in the FIRST time it enters the viewport,
 * then never animates again (one-shot; the observer disconnects). Ported from
 * the approved POC per docs/plans/PROD-1947-motion-animation-spec.md:
 * opacity 0 + translateY(28px) → identity, `--motion-reveal` (700ms),
 * decelerating ease, triggered at 85% viewport. No scroll-scrubbing.
 *
 * SSR/SEO-safe by inversion: the server renders content fully visible (full
 * content in initial HTML; no-JS users and crawlers never see hidden
 * sections). On hydration the element is hidden — WITHOUT transition — only
 * if motion is allowed AND it is still below the 85% line (above-fold
 * sections never flash). Animates transform/opacity only (CLS ≈ 0).
 * `prefers-reduced-motion: reduce` → everything stays static.
 */
type RevealProps = {
  children: ReactNode;
  /** Initial vertical offset in px (POC default 28). */
  y?: number;
  /** Optional transition delay in ms. */
  delayMs?: number;
  className?: string;
};

type RevealState = "visible" | "pending" | "revealed";

const TRIGGER_VIEWPORT_RATIO = 0.85;

export function Reveal({ children, y = 28, delayMs = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    // Already at/above the trigger line on load → keep visible, no flash.
    if (el.getBoundingClientRect().top < window.innerHeight * TRIGGER_VIEWPORT_RATIO) {
      return undefined;
    }

    setState("pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("revealed");
          io.disconnect();
        }
      },
      // Fire when the element's top crosses 85% of the viewport height.
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isHidden = state === "pending";

  return (
    <div
      ref={ref}
      className={cn("ease-out will-change-[opacity,transform]", className)}
      style={{
        transitionProperty: "opacity, transform",
        // Hide instantly (0ms) at hydration; animate only on the reveal.
        transitionDuration: isHidden ? "0ms" : "var(--motion-reveal, 700ms)",
        transitionDelay: !isHidden && delayMs ? `${delayMs}ms` : undefined,
        opacity: isHidden ? 0 : 1,
        transform: isHidden ? `translateY(${y}px)` : "translateY(0)",
      }}
    >
      {children}
    </div>
  );
}
