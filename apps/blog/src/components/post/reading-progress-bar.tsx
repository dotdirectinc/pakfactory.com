"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getArticleReadingProgress,
  POST_ARTICLE_ID,
  READING_PROGRESS_SLOT_ID,
} from "@/lib/reading-progress";

/** Scroll progress indicator portaled into the sticky category nav slot (post detail only). */
export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMountNode(document.getElementById(READING_PROGRESS_SLOT_ID));
  }, []);

  useEffect(() => {
    const article = document.getElementById(POST_ARTICLE_ID);
    if (!article) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const el = document.getElementById(POST_ARTICLE_ID);
      if (!el) return;
      setProgress(getArticleReadingProgress(el));
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(article);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  if (!mountNode) return null;

  return createPortal(
    // Hidden until there's actual progress — no empty default bar at the top.
    <div
      className="relative h-1 w-full bg-border/40 transition-opacity duration-200"
      style={{ opacity: progress > 0 ? 1 : 0 }}
      aria-hidden
    >
      <div
        className="h-full bg-primary"
        style={{ width: `${progress * 100}%` }}
      />
    </div>,
    mountNode,
  );
}
