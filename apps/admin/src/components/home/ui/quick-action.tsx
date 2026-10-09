import { Badge } from "@pakfactory/ui/components/badge";
import { cn } from "@pakfactory/ui/lib/utils";

export type QuickActionProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

/** Props-only pill control. Caller owns navigation / mock generation. */
export function QuickAction({
  label,
  onClick,
  disabled = false,
}: QuickActionProps) {
  return (
    <Badge variant="outline" asChild>
      <button
        type="button"
        className={cn(
          "h-8 px-3 text-sm",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </button>
    </Badge>
  );
}
