"use client";

import { useEffect, useState } from "react";
import { Card } from "@pakfactory/ui/components/card";
import {
  MOSAIC_GRID_CLASS,
  mosaicSpanClass,
  type MosaicSpan,
} from "@/components/home/ui/mosaic-span";
import { ADMIN_HOME_COPY } from "@/lib/copy/home";

const SKELETON_SPANS: readonly MosaicSpan[] = ["1", "1", "1", "2", "1"];
const REVEAL_MS = 280;

function SkeletonCard({ span }: { span: MosaicSpan }) {
  return (
    <Card
      className={`${mosaicSpanClass(span)} flex min-h-52 flex-col gap-4 p-6 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300`}
    >
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-auto h-24 w-full animate-pulse rounded-lg bg-muted" />
    </Card>
  );
}

/** Progressive placeholder mosaic — tiles appear one-by-one while PakAI builds. */
export function GeneratingMosaic() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      setVisibleCount(count);
      if (count >= SKELETON_SPANS.length) {
        clearInterval(id);
      }
    }, REVEAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full flex-col gap-4" aria-busy="true">
      <p className="text-sm text-muted-foreground" role="status">
        {ADMIN_HOME_COPY.assemblingWidgets}
      </p>
      <div className={MOSAIC_GRID_CLASS}>
        {SKELETON_SPANS.slice(0, visibleCount).map((span, index) => (
          <SkeletonCard key={`skeleton-${index}`} span={span} />
        ))}
      </div>
    </div>
  );
}
