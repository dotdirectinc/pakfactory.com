"use client";

import { ADMIN_HOME_COPY } from "@/lib/copy/home";

function timeOfDay(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ displayName }: { displayName: string }) {
  const line = `${timeOfDay(new Date())}, ${displayName}`;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1
        className="text-4xl font-semibold tracking-tight text-foreground"
        suppressHydrationWarning
      >
        {line}
      </h1>
      <p className="text-base font-normal text-muted-foreground">
        {ADMIN_HOME_COPY.subtitle}
      </p>
    </div>
  );
}
