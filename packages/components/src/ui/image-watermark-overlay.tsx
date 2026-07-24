import type { CSSProperties, ReactNode } from "react";
import {
  WATERMARK_PADDING_PERCENT,
  WATERMARK_WIDTH_PERCENT,
} from "../commons/watermark-geometry";

export {
  WATERMARK_PADDING_PERCENT,
  WATERMARK_WIDTH_PERCENT,
} from "../commons/watermark-geometry";

export type ImageWatermarkOverlayProps = {
  children: ReactNode;
  /** Absolute or CDN URL for the transparent watermark logo. */
  watermarkSrc: string;
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
 */
export function ImageWatermarkOverlay({
  children,
  watermarkSrc,
  opacity = 0.85,
  className,
  style,
}: ImageWatermarkOverlayProps) {
  const clampedOpacity = Math.min(1, Math.max(0, opacity));

  return (
    <div className={className ?? "relative"} style={style}>
      {children}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative overlay; not content LCP */}
      <img
        src={watermarkSrc}
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
