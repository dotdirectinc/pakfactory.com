import type { ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";

/** Shared content column — keep header, sticky nav, and body gutters aligned. */
export function AdminPageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1160px] px-6", className)}>
      {children}
    </div>
  );
}
