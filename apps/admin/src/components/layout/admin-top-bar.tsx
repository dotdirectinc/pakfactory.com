import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
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
    <header className="relative z-30 flex h-[60px] shrink-0 items-center gap-2 bg-foreground px-4 text-background sm:px-6 lg:px-8">
      <div className="z-10 flex min-w-0 shrink-0 items-center gap-2">
        <Link
          href="/requests"
          aria-label="PakFactory Admin home"
          className="shrink-0"
        >
          <AdminLogo className="[&_img]:brightness-0 [&_img]:invert" />
        </Link>

        {devBypassActive ? (
          <Badge
            variant="secondary"
            className="hidden shrink-0 rounded-md border-0 bg-background/15 px-2 py-1 text-xs font-medium text-background sm:inline-flex"
          >
            Dev Mode
          </Badge>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center px-4 sm:flex">
        <div className="pointer-events-auto w-full max-w-2xl">
          <AdminSearchTrigger />
        </div>
      </div>

      <div className="z-10 ml-auto flex shrink-0 items-center gap-2">
        <div className="sm:hidden">
          <AdminSearchTrigger compact />
        </div>
        <AdminAccountMenu {...account} />
      </div>
    </header>
  );
}
