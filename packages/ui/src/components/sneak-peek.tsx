"use client";

import * as React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@pakfactory/ui/components/hover-card";
import { canHoverPeek } from "@pakfactory/ui/lib/can-hover-peek";
import { cn } from "@pakfactory/ui/lib/utils";

export type SneakPeekSide = "top" | "right" | "bottom" | "left";

export type SneakPeekProps = {
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  /** Destination for the Learn more CTA (same as the trigger link). */
  href?: string | null;
  learnMoreLabel?: string;
  /** Peek placement relative to the trigger. Default: right. */
  side?: SneakPeekSide;
  /**
   * When false, renders children only (no peek). Defaults to `canHoverPeek()`
   * after mount so SSR/touch never show a sticky hover card.
   */
  enabled?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

function hasPeekContent(
  excerpt?: string | null,
  imageUrl?: string | null,
): boolean {
  return Boolean(excerpt?.trim() || imageUrl?.trim());
}

/**
 * Props-only desktop sneak peek: thumb left, copy right, optional Learn more.
 * Children stay the interactive control (typically a Link). Touch skips peek.
 */
export function SneakPeek({
  title,
  excerpt,
  imageUrl,
  imageAlt,
  href,
  learnMoreLabel = "Learn more",
  side = "right",
  enabled,
  children,
  className,
  contentClassName,
}: SneakPeekProps) {
  const [pointerAllowsPeek, setPointerAllowsPeek] = React.useState(false);

  React.useEffect(() => {
    setPointerAllowsPeek(canHoverPeek());
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setPointerAllowsPeek(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const peekEnabled =
    (enabled ?? pointerAllowsPeek) && hasPeekContent(excerpt, imageUrl);

  if (!peekEnabled) {
    return <>{children}</>;
  }

  const trimmedExcerpt = excerpt?.trim() || null;
  const trimmedImage = imageUrl?.trim() || null;
  const trimmedHref = href?.trim() || null;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className={cn("w-80 p-0", contentClassName)}
        side={side}
        align="start"
      >
        <div className={cn("flex gap-3 p-3", className)}>
          {trimmedImage ? (
            <img
              src={trimmedImage}
              alt={imageAlt?.trim() || title}
              className="size-14 shrink-0 rounded-md bg-muted object-cover"
            />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm font-semibold leading-5 text-foreground">
              {title}
            </p>
            {trimmedExcerpt ? (
              <p className="line-clamp-3 text-xs leading-4 text-muted-foreground">
                {trimmedExcerpt}
              </p>
            ) : null}
            {trimmedHref ? (
              <a
                href={trimmedHref}
                className="mt-1 w-fit text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {learnMoreLabel}
              </a>
            ) : null}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
