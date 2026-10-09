import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import { MARK_GREEN } from "@/components/layout/logo-mark";

export type RankedListItem = {
  label: string;
  value: number;
};

export type RankedListProps = {
  title: string;
  description?: string;
  items: readonly RankedListItem[];
  valueSuffix?: string;
};

/** Props-only ordered list with proportional bars. */
export function RankedList({
  title,
  description,
  items,
  valueSuffix = "",
}: RankedListProps) {
  const max = Math.max(...items.map((item) => item.value), 1);

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
        <ol className="flex flex-col gap-3">
          {items.map((item, index) => {
            const width = Math.round((item.value / max) * 100);
            return (
              <li key={item.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-foreground">
                    <span className="text-muted-foreground tabular-nums">
                      {index + 1}.
                    </span>{" "}
                    {item.label}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {item.value}
                    {valueSuffix}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${width}%`,
                      backgroundColor: MARK_GREEN,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
