import { cn } from "@pakfactory/ui/lib/utils";
import type { PakAiMosaicSpan } from "@/lib/home/pak-ai-presets";

export type MosaicSpan = PakAiMosaicSpan;

export function mosaicSpanClass(span: MosaicSpan = "1"): string {
  return cn(
    span === "2" && "md:col-span-2 lg:col-span-2",
    span === "3" && "md:col-span-2 lg:col-span-3",
  );
}

export const MOSAIC_GRID_CLASS =
  "grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3";
