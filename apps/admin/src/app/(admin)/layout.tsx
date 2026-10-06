import type { ReactNode } from "react";
import {
  accountAvatarUrl,
  accountDisplayName,
} from "@pakfactory/supabase/session";
import { AdminShell } from "@/components/layout/admin-shell";
import { isAdminDevBypassEnabled } from "@/lib/auth/dev-bypass";
import { requireInternalUser } from "@/lib/auth/require-internal-user";
import { hasRegistryGrant } from "@/lib/spec/require-grant";
import { fetchSpecMe } from "@/lib/spec/registry-api";

export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireInternalUser("/requests");
  const specAccess = await hasRegistryGrant();
  // Memoised per request with hasRegistryGrant's own call — no second round trip.
  const me = specAccess ? await fetchSpecMe() : null;

  return (
    <AdminShell
      devBypassActive={isAdminDevBypassEnabled()}
      specAccess={specAccess}
      account={{
        displayName: accountDisplayName(user),
        email: user.email ?? "",
        avatarUrl: accountAvatarUrl(user),
        canSyncNotion: Boolean(me?.capabilities.includes("catalog.sync.notion")),
      }}
    >
      {children}
    </AdminShell>
  );
}
