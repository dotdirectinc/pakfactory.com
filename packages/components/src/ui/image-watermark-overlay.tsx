import type { CSSProperties, ReactNode } from "react";
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
  /** White / light logo (dark photo corners). */
  lightSrc?: string | null;
  /** Dark logo (light photo corners). */
  darkSrc?: string | null;
  /**
   * @deprecated Prefer lightSrc/darkSrc. Single-mark fallback (treated as light).
   */
  watermarkSrc?: string;
  /**
   * Server-resolved adaptive mark (from Sanity LQIP at render).
   * Missing → null luminance → white (light) fallback.
   */
  variant?: "light" | "dark" | null;
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
 * Light vs dark is chosen by the server via `variant` (LQIP luminance).
 */
export function ImageWatermarkOverlay({
  children,
  lightSrc,
  darkSrc,
  watermarkSrc,
  variant = null,
  opacity = 0.85,
  className,
  style,
}: ImageWatermarkOverlayProps) {
  const resolvedLight = lightSrc?.trim() || watermarkSrc?.trim() || null;
  const resolvedDark = darkSrc?.trim() || null;

  const markSrc = pickWatermarkSrc({
    lightSrc: resolvedLight,
    darkSrc: resolvedDark,
    luminance: variant === "dark" ? 1 : variant === "light" ? 0 : null,
  });

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
