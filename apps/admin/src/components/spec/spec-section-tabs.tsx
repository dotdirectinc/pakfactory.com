import Link from "next/link";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  countWaitingLibraryChanges,
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

export type ReviewTab = "website" | "library" | "held" | "mapping";

/**
 * Review: website changes (frames), the production library, held changes and mapping. Only what
 * arrives and waits is counted (frames, held changes) — the review backlogs show as progress on
 * their own pages, so a count of 1,400 records to review does not drown the rest.
 */
export async function ReviewTabs({ active }: { active: ReviewTab }) {
  const [frames, held] = await Promise.all([
    listDraftChangesets(),
    countWaitingLibraryChanges(),
  ]);
  const tabs: Tab[] = [
    {
      key: "website",
      label: COPY.review.website,
      href: "/spec",
      count: frames.ok ? frames.data.length : 0,
    },
    { key: "library", label: COPY.review.library, href: "/spec/library" },
    {
      key: "held",
      label: COPY.review.held,
      href: "/spec/library/changes",
      count: held,
    },
    { key: "mapping", label: COPY.review.mapping, href: "/spec/mapping" },
  ];
  return <Tabs label={COPY.review.label} tabs={tabs} active={active} />;
}

export function CatalogModeTabs({ active }: { active: "table" | "map" }) {
  const tabs: Tab[] = [
    { key: "table", label: COPY.catalog.table, href: "/spec/catalog" },
    { key: "map", label: COPY.catalog.map, href: "/spec/map" },
  ];
  return <Tabs label={COPY.catalog.label} tabs={tabs} active={active} />;
}
