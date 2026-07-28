"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { hasWatermarkSrc } from "../commons/watermark-variant";

export type WatermarkMode = "overlay" | "serve";

export type WatermarkConfig = {
  /** Master switch from Global Settings. */
  enabled: boolean;
  /** White / light logo — for dark photo regions. */
  lightSrc: string | null;
  /** Dark logo — for light photo regions. */
  darkSrc: string | null;
  /** 0–1 opacity from settings. */
  opacity: number;
  /**
   * `overlay` = CSS layer (default). `serve` = bake via `/api/wm` (Save as includes mark).
   * Set with `NEXT_PUBLIC_WATERMARK_MODE=serve`.
   */
  mode: WatermarkMode;
  /** Absolute path to the bake-on-serve route (includes blog `basePath` when set). */
  apiPath: string;
};

const WatermarkContext = createContext<WatermarkConfig | null>(null);

export function WatermarkProvider({
  value,
  children,
}: {
  value: WatermarkConfig;
  children: ReactNode;
}) {
  return (
    <WatermarkContext.Provider value={value}>{children}</WatermarkContext.Provider>
  );
}

export function useWatermarkConfig(): WatermarkConfig | null {
  return useContext(WatermarkContext);
}

/**
 * Resolve whether to show the watermark for this image.
 * Opt-in: callers must pass `applyWatermark === true` (detail body/gallery).
 * Omitting the prop keeps page-builder blocks and marketing imagery clean.
 */
export function shouldApplyWatermark(
  config: WatermarkConfig | null | undefined,
  applyWatermark?: boolean,
): config is WatermarkConfig & {
  lightSrc: string | null;
  darkSrc: string | null;
} {
  if (applyWatermark !== true) return false;
  if (!config?.enabled) return false;
  if (!hasWatermarkSrc(config)) return false;
  return true;
}

export function isServeWatermarkMode(
  config: WatermarkConfig | null | undefined,
): boolean {
  return config?.mode === "serve";
}
