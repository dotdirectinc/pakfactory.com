"use client";

import { useEffect, useRef, useState } from "react";
import {
  adapterForHost,
  genericHeightFromMessage,
} from "./embed-height-adapters";

type EmbedFrameProps = {
  url: string;
  title: string;
  mode: "height" | "auto" | "aspect";
  /** Fixed height, or the fallback height in auto mode. */
  height: number;
  aspectRatio: string;
};

export function EmbedFrame({
  url,
  title,
  mode,
  height,
  aspectRatio,
}: EmbedFrameProps) {
  const [autoHeight, setAutoHeight] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (mode !== "auto") return;
    let embedOrigin: string;
    let embedHost: string;
    try {
      const parsedUrl = new URL(url);
      embedOrigin = parsedUrl.origin;
      embedHost = parsedUrl.hostname;
    } catch {
      return;
    }

    // Prefer a host-specific adapter (e.g. Zoho Survey); fall back to the
    // generic common-shape parser for cooperating providers.
    const adapter = adapterForHost(embedHost);

    function onMessage(event: MessageEvent) {
      // Security: only trust height messages from the embed's own origin and,
      // when available, its own window.
      if (event.origin !== embedOrigin) return;
      if (
        iframeRef.current &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      const parsed =
        adapter?.parseHeight(event.data) ??
        genericHeightFromMessage(event.data);
      if (parsed != null) {
        // Clamp to sane bounds to avoid runaway growth / jitter.
        setAutoHeight(Math.min(4000, Math.max(120, Math.round(parsed))));
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode, url]);

  const isAspect = mode === "aspect";
  const resolvedHeight = mode === "auto" ? (autoHeight ?? height) : height;
  const frameStyle = isAspect
    ? { aspectRatio }
    : { height: resolvedHeight };

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-border bg-muted/20 transition-[height] duration-200"
      style={frameStyle}
    >
      <iframe
        ref={iframeRef}
        src={url}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
        allowFullScreen
        className="size-full border-0"
      />
    </div>
  );
}
