import type { ReactNode } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

/** POC topic chip — white rounded-full pill with hairline border + soft shadow. */
export const TOPIC_CHIP_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors hover:border-foreground/30";

type TopicChipProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function TopicChip({ href, children, className }: TopicChipProps) {
  return (
    <Link href={href} className={cn(TOPIC_CHIP_CLASS, className)}>
      {children}
    </Link>
  );
}

type TopicExploreChipProps = {
  href: string;
  label?: string;
  /** Green accent border for homepage Topic Strip (Figma). */
  accent?: boolean;
  className?: string;
};

export function TopicExploreChip({
  href,
  label = "Explore topics",
  accent = false,
  className,
}: TopicExploreChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        TOPIC_CHIP_CLASS,
        accent && "border-green-600 hover:border-green-700",
        className,
      )}
    >
      <Compass className="size-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
