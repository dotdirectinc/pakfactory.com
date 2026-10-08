import Link from "next/link";
import { listSyncHistory } from "@/lib/spec/registry-api";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { SpecSyncHistoryRun } from "@/components/spec/spec-sync-history";
import { ADMIN_SPEC_SYNC_HISTORY_COPY as COPY } from "@/lib/copy/spec";

export const metadata = { title: "Sync history" };

/**
 * Sync history (PROD-2771): the current sync, every past sync with the frames it produced and what
 * was decided, and — for approved frames — the re-check that proves the change landed.
 */
export default async function SpecSyncHistoryPage() {
  await requireRegistryGrant();
  const res = await listSyncHistory();
  const runs = res.ok ? res.data : [];
  const current = runs.filter((r) => r.state === "requested" || r.state === "running");
  const past = runs.filter((r) => r.state === "done" || r.state === "failed");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <AutoRefresh active={current.length > 0} />
      <div className="flex flex-col gap-1">
        <Link href="/spec" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
          ← {COPY.back}
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.lead}</p>
      </div>

      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {COPY.unreachable} ({res.error})
        </p>
      ) : (
        <>
          {current.length ? (
            <section className="flex flex-col gap-1 rounded-md border border-border p-4">
              <h2 className="text-base font-semibold text-foreground">{COPY.current}</h2>
              <ul className="flex flex-col divide-y divide-border">
                {current.map((r) => <SpecSyncHistoryRun key={r.id} run={r} />)}
              </ul>
            </section>
          ) : null}
          <section className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">{COPY.past}</h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">{COPY.none}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {past.map((r) => <SpecSyncHistoryRun key={r.id} run={r} />)}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
