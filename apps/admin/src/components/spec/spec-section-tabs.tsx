import { Suspense } from "react";
import Link from "next/link";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  countWaitingLibraryChanges,
  countWaitingSpecEdits,
  listDraftChangesets,
} from "@/lib/spec/registry-api";
import { ADMIN_SPEC_SECTION_TABS_COPY as COPY } from "@/lib/copy/spec";

/**
 * The tab bars that join pages into one menu entry (Richard, 2026-11-18): Review (the three review
 * workflows, each still its own page and URL) and Website specs (the catalog as a table or as a map).
 */

type Tab = { key: string; label: string; href: string; count?: number };

function Tabs({
  label,
  tabs,
  active,
}: {
  label: string;
  tabs: Tab[];
  active: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap gap-1 border-b border-border text-sm"
    >
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2",
            t.key === active
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count ? (
            <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[11px] leading-none font-semibold text-background tabular-nums">
              {t.count > 99 ? "99+" : t.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export type ReviewTab = "website" | "library" | "proposals" | "held" | "mapping";

type ReviewCounts = { website?: number; proposals?: number; held?: number };

function reviewTabs(c: ReviewCounts): Tab[] {
  return [
    { key: "website", label: COPY.review.website, href: "/spec", count: c.website },
    { key: "library", label: COPY.review.library, href: "/spec/library" },
    // PLAT-85: edits by non-admins (later map additions and vendors) waiting for an admin (ADR-028 D4).
    { key: "proposals", label: COPY.review.proposals, href: "/spec/library/proposals", count: c.proposals },
    { key: "held", label: COPY.review.held, href: "/spec/library/changes", count: c.held },
    { key: "mapping", label: COPY.review.mapping, href: "/spec/mapping" },
  ];
}

/** The Review tab bar without counts: the loading screens, and the bar while its counts load. */
export function ReviewTabsStatic({ active }: { active: ReviewTab }) {
  return <Tabs label={COPY.review.label} tabs={reviewTabs({})} active={active} />;
}

async function ReviewTabsCounted({ active }: { active: ReviewTab }) {
  const [frames, held, proposals] = await Promise.all([
    listDraftChangesets(),
    countWaitingLibraryChanges(),
    countWaitingSpecEdits(),
  ]);
  return (
    <Tabs
      label={COPY.review.label}
      tabs={reviewTabs({ website: frames.ok ? frames.data.length : 0, proposals, held })}
      active={active}
    />
  );
}

/**
 * Review: website changes (frames), the production library, proposals, held changes and mapping. Only
 * what arrives and waits is counted (frames, proposals, held changes) — the review backlogs show as
 * progress on their own pages, so a count of 1,400 records to review does not drown the rest. The bar
 * shows at once; its counts stream in, so a tab switch never waits for them.
 */
export function ReviewTabs({ active }: { active: ReviewTab }) {
  return (
    <Suspense fallback={<ReviewTabsStatic active={active} />}>
      <ReviewTabsCounted active={active} />
    </Suspense>
  );
}

export function CatalogModeTabs({ active }: { active: "table" | "map" }) {
  const tabs: Tab[] = [
    { key: "table", label: COPY.catalog.table, href: "/spec/catalog" },
    { key: "map", label: COPY.catalog.map, href: "/spec/map" },
  ];
  return <Tabs label={COPY.catalog.label} tabs={tabs} active={active} />;
}
