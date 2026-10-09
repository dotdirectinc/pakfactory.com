import type { ReactNode } from "react";
import {
  accountAvatarUrl,
  accountDisplayName,
} from "@pakfactory/supabase/session";
import { AdminShell } from "@/components/layout/admin-shell";
import { isAdminDevBypassEnabled } from "@/lib/auth/dev-bypass";
import { requireInternalUser } from "@/lib/auth/require-internal-user";
import { hasRegistryGrant } from "@/lib/spec/require-grant";
import { fetchSpecMe, listDraftChangesets } from "@/lib/spec/registry-api";

export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireInternalUser("/");
  const specAccess = await hasRegistryGrant();
  // fetchSpecMe is memoised per request with hasRegistryGrant's own call — no second round trip.
  const [me, drafts] = specAccess
    ? await Promise.all([fetchSpecMe(), listDraftChangesets()])
    : [null, null];
  // Frames waiting for approval, for the sidebar's count. Unreachable registry: no count, not an error.
  const pendingFrames = drafts?.ok ? drafts.data.length : 0;

  return (
    <AdminShell
      devBypassActive={isAdminDevBypassEnabled()}
      specAccess={specAccess}
      pendingFrames={pendingFrames}
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
