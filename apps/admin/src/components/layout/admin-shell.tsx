import type { ReactNode } from "react";
import { Toaster } from "@pakfactory/ui/components/sonner";
import type { AdminAccountMenuProps } from "@/components/account/admin-account-menu";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-top-bar";
import { AdminSearchDialog } from "@/components/search/admin-search-dialog";
import { AdminSearchProvider } from "@/components/search/admin-search-provider";

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
    <AdminSearchProvider>
      <div className="flex h-dvh flex-col bg-foreground">
        <AdminTopBar devBypassActive={devBypassActive} account={account} />
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-tl-xl bg-muted">
          <AdminSidebar />
          <main className="min-w-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
        <AdminSearchDialog />
        <Toaster richColors closeButton position="bottom-right" />
      </div>
    </AdminSearchProvider>
  );
}
