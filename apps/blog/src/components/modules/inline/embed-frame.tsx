"use client";

import { useEffect, useRef, useState } from "react";
import { CAPTION_CLASS } from "@/lib/blog-caption";
import {
  adapterForHost,
  genericSizeFromMessage,
} from "./embed-height-adapters";

type EmbedFrameProps = {
  url: string;
  title: string;
  mode: "height" | "auto";
  /** Fixed height, or the fallback height in auto mode. */
  height: number;
  /** Optional fixed max-width, or the fallback width in auto mode. */
  width?: number;
  caption?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

export function EmbedFrame({
  url,
  title,
  mode,
  height,
  width,
  caption,
}: EmbedFrameProps) {
  const [autoHeight, setAutoHeight] = useState<number | null>(null);
  const [autoWidth, setAutoWidth] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (mode !== "auto") return;
    // One-shot: applying a width makes responsive embeds re-render and report a
    // new (smaller) width, which would loop. Detect once on entry, set the size,
    // then stop listening.
    appliedRef.current = false;
    let embedOrigin: string;
    let embedHost: string;
    try {
      const parsedUrl = new URL(url);
      embedOrigin = parsedUrl.origin;
      embedHost = parsedUrl.hostname;
    } catch {
      return;
    }

    // Prefer a host-specific adapter (e.g. Zoho Survey, which reports both its
    // width and height); fall back to the generic common-shape parser.
    const adapter = adapterForHost(embedHost);

    function onMessage(event: MessageEvent) {
      if (appliedRef.current) return;
      // Security: only trust size messages from the embed's own origin and,
      // when available, its own window.
      if (event.origin !== embedOrigin) return;
      if (
        iframeRef.current &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      const parsed =
        adapter?.parseSize(event.data) ?? genericSizeFromMessage(event.data);
      if (!parsed) return;
      if (parsed.height != null) setAutoHeight(clamp(parsed.height, 120, 4000));
      if (parsed.width != null) setAutoWidth(clamp(parsed.width, 240, 1600));
      appliedRef.current = true;
      window.removeEventListener("message", onMessage);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode, url]);

  const resolvedHeight = mode === "auto" ? (autoHeight ?? height) : height;
  const resolvedWidth = mode === "auto" ? (autoWidth ?? width) : width;

  return (
    <figure
      className="mx-auto my-8"
      style={resolvedWidth ? { maxWidth: resolvedWidth } : undefined}
    >
      <div
        className="w-full overflow-hidden rounded-lg bg-background transition-[height,max-width] duration-200"
        style={{ height: resolvedHeight }}
      >
        <iframe
          ref={iframeRef}
          src={url}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          allowFullScreen
          // Blends with the page where the embed's content is transparent; the
          // embed's own (cross-origin) background can't be restyled from here.
          className="size-full border-0 bg-background"
        />
      </div>
      {caption ? (
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
