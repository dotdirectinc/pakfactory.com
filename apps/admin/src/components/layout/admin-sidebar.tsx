"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Inbox, Settings, SlidersHorizontal } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

type NavIcon = typeof Inbox;

type NavChild = {
  href: string;
  label: string;
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
    children: [
      {
        href: "/spec/rules",
        label: "Current rules",
        match: (path) => path === "/spec/rules" || path.startsWith("/spec/rules/"),
      },
      {
        href: "/spec",
        label: "Frames to approve",
        match: (path) =>
          path === "/spec" ||
          (path.startsWith("/spec/") &&
            !["/spec/rules", "/spec/products", "/spec/customizations", "/spec/properties", "/spec/solutions", "/spec/help", "/spec/catalog"].some((p) =>
              path.startsWith(p),
            )),
      },
      // The catalog: every record type as a table (PROD-2926), 2026-10-08 the one entry for browsing.
      // The old list pages and the detail pages tables link to (/spec/products/<id>,
      // /spec/customizations/<id>) are part of it, so they light this entry.
      {
        href: "/spec/catalog",
        label: "Catalog",
        match: (path) => ["/spec/catalog", "/spec/products", "/spec/customizations", "/spec/solutions"].some((p) => path.startsWith(p)),
      },
      {
        href: "/spec/properties",
        label: "Properties",
        match: (path) => path.startsWith("/spec/properties"),
      },
      // What each page and button does, the catalog structure, syncing and registry codes (PROD-2771).
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
}: {
  item: NavGroupItem;
  pathname: string;
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
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "relative rounded-xs px-2 py-2 text-sm transition-colors",
                  "before:absolute before:top-1/2 before:right-full before:h-px before:w-3 before:bg-border",
                  active
                    ? "bg-background font-semibold text-foreground"
                    : "font-normal text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSidebar({ specAccess }: { specAccess: boolean }) {
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
            <NavGroup key={entry.id} item={entry} pathname={pathname} />
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
