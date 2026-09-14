import Link from "next/link";
import {
  AdminAccountMenu,
  type AdminAccountMenuProps,
} from "@/components/account/admin-account-menu";
import { AdminLogo } from "@/components/layout/admin-logo";
import { AdminSearchTrigger } from "@/components/search/admin-search-trigger";

export function AdminTopBar({
  devBypassActive,
  account,
}: {
  devBypassActive: boolean;
  account: AdminAccountMenuProps;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 bg-foreground px-3 text-background sm:px-4">
      <Link
        href="/requests"
        aria-label="PakFactory Admin home"
        className="shrink-0"
      >
        <AdminLogo className="[&_img]:h-6 [&_img]:brightness-0 [&_img]:invert" />
      </Link>

      {devBypassActive ? (
        <span className="hidden shrink-0 rounded-md bg-amber-400/90 px-2 py-0.5 text-xs font-medium text-amber-950 sm:inline">
          Dev Mode
        </span>
      ) : null}

      <div className="mx-auto hidden min-w-0 max-w-md flex-1 sm:block">
        <AdminSearchTrigger />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
        <div className="sm:hidden">
          <AdminSearchTrigger compact />
        </div>
        <AdminAccountMenu {...account} size="sm" />
      </div>
    </header>
  );
}
