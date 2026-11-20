"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  House,
  Inbox,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

type NavIcon = typeof Inbox;

/** Counts the layout passes in, for entries that show how much is waiting. */
type NavCounts = { review: number };

type NavChild = {
  href: string;
  label: string;
  /** When above zero: the label turns bold and a pill shows the number. */
  count?: keyof NavCounts;
  match: (path: string) => boolean;
};

type NavLinkItem = {
  type: "link";
  href: string;
  label: string;
  icon: NavIcon;
  match: (path: string) => boolean;
};

type NavGroupItem = {
  type: "group";
  id: string;
  /** Hidden from staff without a registry grant (Spec System). */
  requiresRegistryGrant?: boolean;
  label: string;
  icon: NavIcon;
  children: readonly NavChild[];
};

type NavEntry = NavLinkItem | NavGroupItem;

const NAV: readonly NavEntry[] = [
  {
    type: "link",
    href: "/",
    label: "Home",
    icon: House,
    match: (path) => path === "/",
  },
  {
    type: "group",
    id: "leads",
    label: "Leads",
    icon: Inbox,
    children: [
      {
        href: "/requests",
        label: "Requests",
        match: (path) => path === "/requests" || path.startsWith("/requests/"),
      },
    ],
  },
  // Hidden without a registry grant (the layout asks the backend). /spec still 404s
  // anyone without one, so a direct URL learns nothing either.
  {
    type: "group",
    id: "spec",
    requiresRegistryGrant: true,
    label: "Spec System",
    icon: FileText,
    // By what you came to do (Richard, 2026-11-18, replacing the same day's grouping by kind of spec):
    // job specs (for now: how close each website spec is to one), website specs (with their compatibility rules), review, help. Pages that
    // answer the same question share one entry and switch with tabs (Table | Map; the review workflows).
    // URLs are unchanged.
    children: [
      // Job specs (Richard, 2026-11-18). None exist yet; until they do, the page shows whether one could be
      // built from each website spec with approved data only. URL kept: /spec/readiness.
      {
        href: "/spec/readiness",
        label: "Job specs",
        match: (path) => path.startsWith("/spec/readiness"),
      },
      // Website specs: the catalog as tables (PROD-2926) or as a map (PROD-2960), one entry with a Table |
      // Map switch. The record pages its tables link to, the retired list URLs and the compatibility rules
      // overview (reached from a line under the tabs; rules are edited on records, 2026-11-18) light it too.
      {
        href: "/spec/catalog",
        label: "Website specs",
        match: (path) =>
          ["/spec/catalog", "/spec/products", "/spec/customizations", "/spec/solutions", "/spec/properties"].some((p) => path.startsWith(p)) ||
          path === "/spec/map" ||
          path.startsWith("/spec/map/") ||
          path.startsWith("/spec/rules"),
      },
      // Review: website changes (frames, syncs — the old Registry desk at /spec), the production library
      // (PFP-124), held changes and mapping (PLAT-52), switched with tabs. The count is what arrives and
      // waits — frames, held changes and proposals — not the review backlogs, which show as progress on their pages.
      {
        href: "/spec",
        label: "Review",
        count: "review",
        match: (path) =>
          path === "/spec" ||
          path.startsWith("/spec/library") ||
          path.startsWith("/spec/mapping") ||
          (path.startsWith("/spec/") &&
            !["/spec/rules", "/spec/products", "/spec/customizations", "/spec/properties", "/spec/solutions", "/spec/help", "/spec/catalog", "/spec/map", "/spec/readiness"].some((p) =>
              path.startsWith(p),
            )),
      },
      // What each page and button does, the three kinds of spec, syncing and registry codes (PROD-2771).
      {
        href: "/spec/help",
        label: "Help",
        match: (path) => path.startsWith("/spec/help"),
      },
    ],
  },
  {
    type: "group",
    id: "customization-library",
    label: "Customization Library",
    icon: SlidersHorizontal,
    children: [
      {
        href: "/customization-library/property-controls",
        label: "Control gallery",
        match: (path) =>
          path === "/customization-library/property-controls" ||
          path.startsWith("/customization-library/property-controls/"),
      },
    ],
  },
];

const rowBase =
  "flex w-full items-center gap-2 rounded-xs px-2 py-2 text-left text-sm font-semibold transition-colors";

function LeafLink({ item, pathname }: { item: NavLinkItem; pathname: string }) {
  const active = item.match(pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        rowBase,
        active
          ? "bg-background text-foreground"
          : "text-foreground/80 hover:bg-background/70 hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  counts,
}: {
  item: NavGroupItem;
  pathname: string;
  counts: NavCounts;
}) {
  const childActive = item.children.some((c) => c.match(pathname));
  const [open, setOpen] = useState(childActive);
  const Icon = item.icon;

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        className={cn(
          rowBase,
          "text-foreground/80 hover:bg-background/70 hover:text-foreground",
        )}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {item.label}
      </button>
      {open ? (
        <div className="relative ml-4 flex flex-col gap-0.5 border-l border-border pl-3">
          {item.children.map((child) => {
            const active = child.match(pathname);
            const n = child.count ? counts[child.count] : 0;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-xs px-2 py-2 text-sm transition-colors",
                  "before:absolute before:top-1/2 before:right-full before:h-px before:w-3 before:bg-border",
                  active
                    ? "bg-background font-semibold text-foreground"
                    : n > 0
                      ? "font-semibold text-foreground hover:text-foreground"
                      : "font-normal text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="min-w-0 flex-1 truncate">{child.label}</span>
                {n > 0 ? (
                  <span
                    className="shrink-0 rounded-full bg-foreground px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums text-background"
                    aria-label={`${n} pending`}
                  >
                    {n > 99 ? "99+" : n}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSidebar({
  specAccess,
  reviewCount,
}: {
  specAccess: boolean;
  /** Frames, held changes and proposals waiting (Review). */
  reviewCount: number;
}) {
  const pathname = usePathname();
  const nav = NAV.filter(
    (entry) => !(entry.type === "group" && entry.requiresRegistryGrant && !specAccess),
  );

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-muted/40 md:flex">
      <nav aria-label="Primary" className="flex flex-col gap-0.5 p-2 pt-3">
        {nav.map((entry) =>
          entry.type === "link" ? (
            <LeafLink key={entry.href} item={entry} pathname={pathname} />
          ) : (
            <NavGroup
              key={entry.id}
              item={entry}
              pathname={pathname}
              counts={{ review: reviewCount }}
            />
          ),
        )}
      </nav>

      <div className="mt-auto border-t border-border p-2">
        <span
          className="flex cursor-not-allowed items-center gap-2 rounded-xs px-2 py-2 text-sm font-semibold text-muted-foreground/60"
          aria-disabled="true"
          title="Coming soon"
        >
          <Settings className="size-4 shrink-0" aria-hidden />
          Settings
        </span>
      </div>
    </aside>
  );
}
