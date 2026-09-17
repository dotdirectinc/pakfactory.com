"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Settings, SlidersHorizontal } from "lucide-react";
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
  {
    type: "group",
    id: "customization-library",
    label: "Customization Library",
    icon: SlidersHorizontal,
    children: [
      {
        href: "/customization-library/property-controls",
        label: "Property Controls",
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

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-muted/40 md:flex">
      <nav aria-label="Primary" className="flex flex-col gap-0.5 p-2 pt-3">
        {NAV.map((entry) =>
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
