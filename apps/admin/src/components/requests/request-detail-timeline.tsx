"use client";

import type { RequestActivity } from "@pakfactory/domain/request";
import { toast } from "sonner";
import { cn } from "@pakfactory/ui/lib/utils";
import { ComingSoonButton } from "@/components/requests/coming-soon-button";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

type RequestDetailTimelineProps = {
  activities: RequestActivity[];
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

function showComingSoon() {
  toast.message(ADMIN_REQUESTS_COPY.comingSoon);
}

export function RequestDetailTimeline({
  activities,
}: RequestDetailTimelineProps) {
  const groups = groupActivitiesByDate(activities);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4">
      <h2 className="text-sm font-semibold tracking-tight">
        {ADMIN_REQUESTS_COPY.sectionTimeline}
      </h2>

      <div className="overflow-hidden rounded-md border border-border bg-muted/20">
        <div className="flex gap-3 border-b border-border p-4">
          <div
            aria-hidden
            className="size-8 shrink-0 rounded-full bg-muted"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <textarea
              readOnly
              aria-disabled="true"
              placeholder={ADMIN_REQUESTS_COPY.timelineCommentPlaceholder}
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground opacity-70"
              onPointerDown={(event) => {
                event.preventDefault();
                showComingSoon();
              }}
              onFocus={(event) => {
                event.currentTarget.blur();
                showComingSoon();
              }}
            />
            <div className="flex items-center justify-end">
              <ComingSoonButton
                label={ADMIN_REQUESTS_COPY.timelinePost}
                size="sm"
              />
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
