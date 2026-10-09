import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import { Button } from "@pakfactory/ui/components/button";

export type PromoTileProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

/** Props-only feature promo card. Caller owns Coming Soon / navigation. */
export function PromoTile({
  title,
  description,
  actionLabel,
  onAction,
}: PromoTileProps) {
  return (
    <Card className="flex h-full flex-col gap-4 overflow-hidden bg-brand-cream">
      <CardHeader className="gap-2">
        <CardTitle className="text-base leading-snug font-semibold tracking-tight text-brand-cream-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-brand-cream-foreground/70">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="rounded-full bg-background"
          aria-disabled="true"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
