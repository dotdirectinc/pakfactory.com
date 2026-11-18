"use client";

import { Fragment, useEffect, useState } from "react";
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
type NavCounts = { pendingFrames: number };

type NavChild = {
  href: string;
  label: string;
  /** A heading shown above the first entry of each section (Spec System: one per kind of spec). */
  section?: string;
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
    // Grouped by the three kinds of spec (Richard, 2026-11-18): Job specs (one customer job, quoted and
    // made by a vendor) first, as what the system is for; then Website specs (what customers choose,
    // Crystal), Production specs (what the factory makes, Justin), and the Mapping between them. Help
    // last. URLs are unchanged from the 2026-10-09 order (map, catalog, registry, rules, help).
    children: [
      // Job specs → Readiness: could a job spec be built from each website spec with approved data only.
      {
        href: "/spec/readiness",
        section: "Job specs",
        label: "Readiness",
        match: (path) => path.startsWith("/spec/readiness"),
      },
      // The catalog: every record type as a table (PROD-2926), 2026-10-08 the one entry for browsing —
      // properties & values included, as the fourth level of the Products and Customizations streams.
      // The rules views its tables link to (/spec/products/<id>, /spec/customizations/<id>) are part
      // of it, so they light this entry; the retired list URLs redirect into it.
      {
        href: "/spec/catalog",
        section: "Website specs",
        label: "Catalog",
        match: (path) =>
          ["/spec/catalog", "/spec/products", "/spec/customizations", "/spec/solutions", "/spec/properties"].some((p) => path.startsWith(p)),
      },
      // The catalog as a diagram (PROD-2960): three streams, levels as columns, read-only.
      {
        href: "/spec/map",
        label: "Catalog map",
        // Not "/spec/mapping" (Mapping review), which shares the prefix.
        match: (path) => path === "/spec/map" || path.startsWith("/spec/map/"),
      },
      {
        href: "/spec",
        // The website specs' change desk: syncs, frames waiting (the count) and decided ones (Richard,
        // 2026-10-14). Called "Registry" until 2026-11-18; the registry is the database, not the job.
        label: "Changes",
        count: "pendingFrames",
        match: (path) =>
          path === "/spec" ||
          (path.startsWith("/spec/") &&
            !["/spec/rules", "/spec/products", "/spec/customizations", "/spec/properties", "/spec/solutions", "/spec/help", "/spec/catalog", "/spec/map", "/spec/library", "/spec/mapping", "/spec/readiness"].some((p) =>
              path.startsWith(p),
            )),
      },
      // The website's compatibility rules (Crystal), not the production library's feasibility rules.
      {
        href: "/spec/rules",
        label: "Compatibility rules",
        match: (path) => path === "/spec/rules" || path.startsWith("/spec/rules/"),
      },
      // Spec Library review (PFP-124): imported production records, reviewed and approved record by record.
      {
        href: "/spec/library",
        section: "Production specs",
        label: "Library review",
        match: (path) => path.startsWith("/spec/library"),
      },
      // Mapping review (PLAT-52): website products, options and property values → the production spec.
      {
        href: "/spec/mapping",
        section: "Mapping",
        label: "Mapping review",
        match: (path) => path.startsWith("/spec/mapping"),
      },
      // What each page and button does, the three kinds of spec, syncing and registry codes (PROD-2771).
      {
        href: "/spec/help",
        section: "",
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
            const link = (
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
            // A section starts a group of entries: a small heading ("" = a gap with no heading, e.g. Help).
            if (child.section === undefined) return link;
            return (
              <Fragment key={child.href}>
                {child.section ? (
                  <span className="px-2 pt-2.5 pb-0.5 text-[11px] font-medium tracking-wide text-muted-foreground/80 uppercase">
                    {child.section}
                  </span>
                ) : (
                  <span aria-hidden className="pt-1.5" />
                )}
                {link}
              </Fragment>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSidebar({
  specAccess,
  pendingFrames,
}: {
  specAccess: boolean;
  pendingFrames: number;
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
              counts={{ pendingFrames }}
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
