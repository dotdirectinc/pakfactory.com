"use client";

import { toast } from "sonner";
import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

type ComingSoonButtonProps = {
  label: string;
  className?: string;
  variant?: "outline" | "link" | "ghost";
  size?: "sm" | "default" | "xs";
};

/**
 * Looks disabled but stays clickable so reps get a Coming Soon toast.
 * Native `disabled` would swallow the click.
 */
export function ComingSoonButton({
  label,
  className,
  variant = "outline",
  size = "sm",
}: ComingSoonButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-disabled="true"
      className={cn(
        "opacity-60",
        variant === "link" &&
          "h-auto p-0 text-xs font-medium underline underline-offset-4",
        className,
      )}
      onClick={() => {
        toast.message(ADMIN_REQUESTS_COPY.comingSoon);
      }}
    >
      {label}
    </Button>
  );
}
