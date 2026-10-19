import type { ReactNode } from "react";
import { Skeleton } from "@pakfactory/ui/components/skeleton";
import { cn } from "@pakfactory/ui/lib/utils";

/**
 * The admin back office's shared loading states. Each matches the shape of the page it stands in for,
 * so the layout does not jump when the content arrives; all build on the repo-wide `Skeleton`
 * primitive (packages/ui). Used by every route's `loading.tsx` and by sections that load on their own
 * (Suspense fallbacks).
 */

type Width = "3xl" | "5xl" | "6xl" | "7xl" | "full";
const WIDTH: Record<Width, string> = {
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "",
};

/**
 * The primitive, a shade stronger: `bg-muted` (#f5f5f3) on the admin's white page is nearly invisible,
 * so a section looked empty while it loaded (feedback 2026-10-19).
 */
function Block({ className }: { className?: string }) {
  return <Skeleton className={cn("bg-foreground/10", className)} />;
}

/** Busy region: announced once to screen readers, not read out row by row. */
function Busy({ className = "", label = "Loading", children }: { className?: string; label?: string; children: ReactNode }) {
  return (
    <div className={className} aria-busy="true" aria-live="polite" aria-label={label} role="status">
      {children}
    </div>
  );
}

/** A page's title and lead. */
export function HeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-2">
        <Block className="h-7 w-56" />
        <Block className="h-4 w-96 max-w-full" />
      </div>
      {action ? <Block className="h-8 w-40" /> : null}
    </div>
  );
}

/** A row of tabs or filter chips. */
export function TabsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-2 border-b border-border pb-2">
      {Array.from({ length: count }, (_, i) => (
        <Block key={i} className="h-6 w-24" />
      ))}
    </div>
  );
}

/** A table: a header row, then `rows` rows of `cols` cells. */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex gap-4 bg-muted/40 px-3 py-2.5">
        {Array.from({ length: cols }, (_, c) => (
          <Block key={c} className={`h-3 ${c === 0 ? "w-1/4" : "flex-1"}`} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-t border-border px-3 py-3">
          {Array.from({ length: cols }, (_, c) => (
            <Block key={c} className={`h-4 ${c === 0 ? "w-1/4" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * A section's placeholder — the fallback for a part of a page that loads on its own: a line saying what
 * is loading, over rows in the section's frame, so it never reads as empty.
 */
export function SectionSkeleton({ rows = 2, title = false, label }: { rows?: number; title?: boolean; label?: string }) {
  return (
    <Busy label={label ?? "Loading"} className="flex flex-col gap-2">
      {title ? <Block className="h-4 w-40" /> : null}
      <div className="flex flex-col divide-y divide-border rounded-md border border-border">
        {label ? <InlineLoading className="px-3 py-2 text-xs">{label}</InlineLoading> : null}
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <Block className="h-4 w-1/3" />
            <Block className="h-4 flex-1" />
            <Block className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** A record's page: fields beside a side panel, then a list. */
function DetailBody() {
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Block className="h-4 w-32" />
            <Block className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-border p-4">
        <Block className="h-4 w-24" />
        <Block className="h-24 w-full" />
      </div>
      <div className="lg:col-span-2">
        <TableSkeleton rows={5} cols={3} />
      </div>
    </div>
  );
}

/** The Spec Map: columns of cards. */
function MapBody() {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
      {Array.from({ length: 5 }, (_, c) => (
        <div key={c} className="flex w-56 shrink-0 flex-col gap-2 rounded-md border border-border p-2">
          <Block className="h-4 w-24" />
          {Array.from({ length: 7 - (c % 3) }, (_, i) => (
            <Block key={i} className="h-12 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SectionFrame({ rows, title }: { rows: number; title: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {title ? <Block className="h-4 w-40" /> : null}
      <div className="flex flex-col divide-y divide-border rounded-md border border-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <Block className="h-4 w-1/3" />
            <Block className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stacked sections — the Registry's overview, the Home page. */
function SectionsBody() {
  return (
    <div className="flex flex-col gap-6">
      <SectionFrame title rows={2} />
      <div className="grid gap-3 md:grid-cols-2">
        <SectionFrame title rows={3} />
        <SectionFrame title rows={3} />
      </div>
    </div>
  );
}

/** Running text — Help. */
function ArticleBody() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, p) => (
        <div key={p} className="flex flex-col gap-2">
          <Block className="h-5 w-48" />
          <Block className="h-4 w-full" />
          <Block className="h-4 w-11/12" />
          <Block className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** A list of entries — sync history, requests. */
function ListBody() {
  return (
    <div className="flex flex-col divide-y divide-border rounded-md border border-border">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 px-3 py-3">
          <div className="flex gap-2">
            <Block className="h-5 w-16" />
            <Block className="h-5 w-40" />
          </div>
          <Block className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export type PageSkeletonVariant = "table" | "detail" | "map" | "sections" | "list" | "article";

/**
 * A whole page while its server render is on the way — what a route's `loading.tsx` returns, shown the
 * moment a link is clicked.
 */
export function PageSkeleton({
  variant,
  width = "7xl",
  tabs = false,
  action = false,
}: {
  variant: PageSkeletonVariant;
  width?: Width;
  /** Show a tab / filter row under the header. */
  tabs?: boolean;
  /** Show an action button in the header (e.g. Sync Changes). */
  action?: boolean;
}) {
  const fill = variant === "map";
  return (
    <Busy
      className={`mx-auto flex w-full flex-col gap-4 ${WIDTH[width]} ${fill ? "h-[calc(100dvh-7rem)]" : ""}`}
    >
      <HeaderSkeleton action={action} />
      {tabs ? <TabsSkeleton /> : null}
      {variant === "table" ? <TableSkeleton /> : null}
      {variant === "detail" ? <DetailBody /> : null}
      {variant === "map" ? <MapBody /> : null}
      {variant === "sections" ? <SectionsBody /> : null}
      {variant === "list" ? <ListBody /> : null}
      {variant === "article" ? <ArticleBody /> : null}
    </Busy>
  );
}

/** A small inline "loading" — a spinner and a short line, for client-side loads inside a page. */
export function InlineLoading({ children = "Loading…", className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <p role="status" aria-live="polite" className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      {children}
    </p>
  );
}
