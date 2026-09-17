"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Settings, SlidersHorizontal } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

const PRIMARY_NAV = [
  {
    href: "/requests",
    label: "Requests",
    icon: FileText,
    match: (path: string) =>
      path === "/requests" || path.startsWith("/requests/"),
  },
  // Shown to everyone; /spec itself 404s anyone without a registry grant, so a
  // sales member who clicks it learns nothing about what lives there.
  {
    href: "/spec",
    label: "Spec registry",
    icon: SlidersHorizontal,
    match: (path: string) => path === "/spec" || path.startsWith("/spec/"),
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-muted/40 md:flex">
      <nav aria-label="Primary" className="flex flex-col gap-1 p-2 pt-3">
        {PRIMARY_NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                active
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border p-2">
        <span
          className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground/60"
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
