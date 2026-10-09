import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import { Button } from "@pakfactory/ui/components/button";

export type ActionQueueItem = {
  id: string;
  label: string;
  detail?: string;
};

export type ActionQueueProps = {
  title: string;
  description?: string;
  items: readonly ActionQueueItem[];
  actionLabel: string;
  onAction: (id: string) => void;
};

/** Props-only follow-up checklist. Caller owns Coming Soon / navigation. */
export function ActionQueue({
  title,
  description,
  items,
  actionLabel,
  onAction,
}: ActionQueueProps) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="gap-2">
        <CardTitle className="text-base leading-snug font-semibold tracking-tight">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-sm leading-relaxed">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 pt-2">
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="shrink-0 rounded-full"
                aria-disabled="true"
                onClick={() => onAction(item.id)}
              >
                {actionLabel}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
