"use client";

import { useEffect, useRef } from "react";

import { captureEvent } from "@/lib/analytics";

/**
 * PostReadTracker — fires `post_read` once per view when the reader is
 * genuinely engaged: ≥60% page scroll AND ≥30s dwell (both, per the funnel
 * design on the brain's *blog-analytics-funnels* page). Pushes to GTM
 * dataLayer via `captureEvent`. Renders nothing.
 */
const DWELL_MS = 30_000;
const SCROLL_RATIO = 0.6;

type PostReadTrackerProps = {
  slug: string;
  category?: string;
  tags?: string[];
  author?: string;
  readingTimeMinutes?: number;
};

export function PostReadTracker({
  slug,
  category,
  tags,
  author,
  readingTimeMinutes,
}: PostReadTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    let dwellReached = false;
    let scrollReached = false;

    const maybeFire = () => {
      if (fired.current || !dwellReached || !scrollReached) return;
      fired.current = true;
      captureEvent("post_read", {
        slug,
        category,
        tags,
        author,
        reading_time_minutes: readingTimeMinutes,
      });
    };

    const timer = setTimeout(() => {
      dwellReached = true;
      maybeFire();
    }, DWELL_MS);

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0 || window.scrollY / scrollable >= SCROLL_RATIO) {
        scrollReached = true;
        maybeFire();
        if (scrollReached) window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // short posts may already satisfy the scroll condition

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [slug, category, tags, author, readingTimeMinutes]);

  return null;
}
