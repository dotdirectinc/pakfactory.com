import type { ReactNode } from "react";
import Link from "next/link";
import {
  AdminAccountMenu,
  type AdminAccountMenuProps,
} from "@/components/account/admin-account-menu";
import { AdminLogo } from "@/components/layout/admin-logo";

export function AdminShell({
  children,
  devBypassActive,
  account,
}: {
  children: ReactNode;
  devBypassActive: boolean;
  account: AdminAccountMenuProps;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/requests" aria-label="PakFactory Admin home" className="shrink-0">
            <AdminLogo />
          </Link>
          <span
            className="hidden text-sm text-muted-foreground sm:inline"
            aria-hidden="true"
          >
            |
          </span>
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="truncate text-sm font-medium">Admin</span>
            {devBypassActive ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                Dev Mode
              </span>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <AdminAccountMenu {...account} size="sm" />
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        {children}
      </main>
    </div>
  );
}
