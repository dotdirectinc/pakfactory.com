import type { ReactNode } from "react";
import {
  accountAvatarUrl,
  accountDisplayName,
} from "@pakfactory/supabase/session";
import { AdminShell } from "@/components/layout/admin-shell";
import { isAdminDevBypassEnabled } from "@/lib/auth/dev-bypass";
import { requireInternalUser } from "@/lib/auth/require-internal-user";
import { countWaitingLibraryChanges, fetchSpecMe, listDraftChangesets } from "@/lib/spec/registry-api";
import { startTiming } from "@/lib/perf/timing";

export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  // The sign-in check, the Spec access check and the sidebar's waiting count are independent: run them
  // together (PROD-3116 — one after another they took 1.0–1.35 s). The registry calls carry the user's
  // own token and the backend checks it, so starting them before the sign-in check answers exposes
  // nothing; their results are only used once it has. All three are memoised per request, so the page
  // below reuses them.
  const t = startTiming("layout");
  const [{ user }, me, drafts, held] = await Promise.all([
    t.step("user", requireInternalUser("/")),
    t.step("specMe", fetchSpecMe()),
    t.step("drafts", listDraftChangesets()),
    t.step("held", countWaitingLibraryChanges()),
  ]);
  t.done();
  const specAccess = Boolean(me?.authenticated && me.role);
  // What waits in Review, for the sidebar's count: frames waiting for approval plus held library changes
  // (not the review backlogs). No access or unreachable registry: no count, not an error.
  const reviewCount = specAccess ? (drafts.ok ? drafts.data.length : 0) + held : 0;

  return (
    <AdminShell
      devBypassActive={isAdminDevBypassEnabled()}
      specAccess={specAccess}
      reviewCount={reviewCount}
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
