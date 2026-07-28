"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { sampleCornerLuminance } from "../commons/watermark-luminance";
import {
  WATERMARK_PADDING_PERCENT,
  WATERMARK_WIDTH_PERCENT,
} from "../commons/watermark-geometry";
import { pickWatermarkSrc } from "../commons/watermark-variant";

export {
  WATERMARK_PADDING_PERCENT,
  WATERMARK_WIDTH_PERCENT,
} from "../commons/watermark-geometry";

export type ImageWatermarkOverlayProps = {
  children: ReactNode;
  /**
   * Photo CDN URL — used to sample bottom-right luminance when both light and
   * dark marks are configured. Tiny proxy only (see watermark-luminance).
   */
  photoSrc?: string | null;
  /** White / light logo (dark photo corners). */
  lightSrc?: string | null;
  /** Dark logo (light photo corners). */
  darkSrc?: string | null;
  /**
   * @deprecated Prefer lightSrc/darkSrc. Single-mark fallback (treated as light).
   */
  watermarkSrc?: string;
  /**
   * Bake/luma API base path from WatermarkProvider (e.g. `/api/wm`).
   * When set, luminance is sampled via same-origin `/api/wm-luma` (no CDN CORS).
   */
  apiPath?: string | null;
  /** 0–1. Default 0.85. */
  opacity?: number;
  /**
   * Wrapper className. For `next/image` with `fill`, pass `absolute inset-0`
   * so the overlay fills the same box as the parent `relative` container.
   */
  className?: string;
  style?: CSSProperties;
};

/**
 * Props-only render-time watermark (PROD-2206). Does not mutate image bytes —
 * Studio / Media downloads stay clean. Decorative only (`aria-hidden`).
 * When both light and dark assets exist, picks by photo corner luminance.
 */
export function ImageWatermarkOverlay({
  children,
  photoSrc,
  lightSrc,
  darkSrc,
  watermarkSrc,
  apiPath,
  opacity = 0.85,
  className,
  style,
}: ImageWatermarkOverlayProps) {
  const resolvedLight = lightSrc?.trim() || watermarkSrc?.trim() || null;
  const resolvedDark = darkSrc?.trim() || null;

  const [markSrc, setMarkSrc] = useState(() =>
    pickWatermarkSrc({
      lightSrc: resolvedLight,
      darkSrc: resolvedDark,
      luminance: null,
    }),
  );

  useEffect(() => {
    const light = lightSrc?.trim() || watermarkSrc?.trim() || null;
    const dark = darkSrc?.trim() || null;
    setMarkSrc(
      pickWatermarkSrc({ lightSrc: light, darkSrc: dark, luminance: null }),
    );

    if (!photoSrc?.trim() || !light || !dark) return;

    let cancelled = false;
    const run = () => {
      void sampleCornerLuminance(photoSrc.trim(), { apiPath }).then(
        (luminance) => {
          if (cancelled) return;
          setMarkSrc(
            pickWatermarkSrc({ lightSrc: light, darkSrc: dark, luminance }),
          );
        },
      );
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 1200 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const t = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [photoSrc, lightSrc, darkSrc, watermarkSrc, apiPath]);

  const clampedOpacity = Math.min(1, Math.max(0, opacity));

  if (!markSrc) {
    return (
      <div className={className ?? "relative"} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div className={className ?? "relative"} style={style}>
      {children}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative overlay; not content LCP */}
      <img
        src={markSrc}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute z-[1] select-none object-contain"
        style={{
          width: `${WATERMARK_WIDTH_PERCENT}%`,
          right: `${WATERMARK_PADDING_PERCENT}%`,
          bottom: `${WATERMARK_PADDING_PERCENT}%`,
          opacity: clampedOpacity,
        }}
      />
    </div>
  );
}
