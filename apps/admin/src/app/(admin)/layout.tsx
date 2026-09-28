import type { ReactNode } from "react";
import {
  accountAvatarUrl,
  accountDisplayName,
} from "@pakfactory/supabase/session";
import { AdminShell } from "@/components/layout/admin-shell";
import { isAdminDevBypassEnabled } from "@/lib/auth/dev-bypass";
import { requireInternalUser } from "@/lib/auth/require-internal-user";
import { hasRegistryGrant } from "@/lib/spec/require-grant";

export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireInternalUser("/requests");
  const specAccess = await hasRegistryGrant();

  return (
    <AdminShell
      devBypassActive={isAdminDevBypassEnabled()}
      specAccess={specAccess}
      account={{
        displayName: accountDisplayName(user),
        email: user.email ?? "",
        avatarUrl: accountAvatarUrl(user),
      }}
    >
      {children}
    </AdminShell>
  );
}
