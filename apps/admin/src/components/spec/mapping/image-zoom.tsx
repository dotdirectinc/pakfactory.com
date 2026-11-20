"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@pakfactory/ui/components/hover-card";
import { cn } from "@pakfactory/ui/lib/utils";

/**
 * A website thumbnail on the Mapping review that shows a larger copy on hover, so a reviewer can make
 * out the product without opening its page. Sanity serves both sizes from the same asset URL.
 */
export function ImageZoom({ src, alt, size, className }: { src: string; alt: string; size: number; className?: string }) {
  return (
    <HoverCard openDelay={150} closeDelay={50}>
      <HoverCardTrigger asChild>
        <img
          src={`${src}?w=${size * 2}&h=${size * 2}&fit=crop&auto=format`}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          tabIndex={0}
          className={cn("shrink-0 cursor-zoom-in rounded-md border border-border object-cover", className)}
        />
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-auto p-1.5">
        <img
          src={`${src}?w=800&h=800&fit=max&auto=format`}
          alt={alt}
          width={360}
          height={360}
          className="size-[360px] rounded object-contain"
        />
      </HoverCardContent>
    </HoverCard>
  );
}
