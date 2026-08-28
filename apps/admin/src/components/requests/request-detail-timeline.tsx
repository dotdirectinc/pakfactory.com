import type { RequestActivity, RequestVersion } from "@pakfactory/domain/request";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

type RequestDetailTimelineProps = {
  activities: RequestActivity[];
  versions: RequestVersion[];
};

type ActivityGroup = {
  dateLabel: string;
  items: RequestActivity[];
};

function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActivityDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function groupActivitiesByDate(
  activities: RequestActivity[],
): ActivityGroup[] {
  const sorted = [...activities].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const groups = new Map<string, RequestActivity[]>();

  for (const activity of sorted) {
    const dateLabel = formatActivityDate(activity.occurredAt);
    const existing = groups.get(dateLabel) ?? [];
    existing.push(activity);
    groups.set(dateLabel, existing);
  }

  return Array.from(groups.entries()).map(([dateLabel, items]) => ({
    dateLabel,
    items,
  }));
}

export function RequestDetailTimeline({
  activities,
  versions,
}: RequestDetailTimelineProps) {
  const latestVersion = versions.length
    ? [...versions].sort((a, b) => b.number - a.number)[0]
    : null;
  const groups = groupActivitiesByDate(activities);

  return (
    <section className="flex flex-col gap-4 rounded-md border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          {ADMIN_REQUESTS_COPY.sectionTimeline}
        </h2>
        {latestVersion ? (
          <Badge variant="secondary" className="rounded-md">
            {latestVersion.label}
          </Badge>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-muted/20">
        <div className="flex gap-3 border-b border-border p-4">
          <div
            aria-hidden
            className="size-8 shrink-0 rounded-full bg-muted"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <textarea
              disabled
              placeholder={ADMIN_REQUESTS_COPY.timelineCommentPlaceholder}
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70"
            />
            <div className="flex items-center justify-end">
              <Button type="button" size="sm" disabled>
                {ADMIN_REQUESTS_COPY.timelinePost}
              </Button>
            </div>
          </div>
        </div>
        <p className="px-4 py-2 text-xs text-muted-foreground">
          {ADMIN_REQUESTS_COPY.timelineStaffOnly}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {ADMIN_REQUESTS_COPY.timelineEmpty}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.dateLabel} className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">
                {group.dateLabel}
              </p>
              <ul className="flex flex-col gap-4 border-l border-border pl-4">
                {group.items.map((activity) => (
                  <li
                    key={activity.id}
                    className={cn(
                      "relative flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
                    )}
                  >
                    <span
                      aria-hidden
                      className="absolute top-1.5 -left-[1.3125rem] size-2 rounded-full bg-muted-foreground"
                    />
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <time
                      dateTime={activity.occurredAt}
                      className="shrink-0 text-xs text-muted-foreground sm:text-right"
                    >
                      {formatActivityTime(activity.occurredAt)}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
