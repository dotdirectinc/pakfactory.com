import type { SyncRun } from "@/lib/spec/registry-api";

/**
 * The runs worth showing (2026-10-06: failed syncs should not stay): dismissed runs never; a failure
 * only until a later run of the same kind succeeds. The rows themselves are kept by the backend.
 */
export function visibleRuns(runs: SyncRun[]): SyncRun[] {
  const lastDone = new Map<string, string>();
  for (const r of runs) if (r.state === "done" && r.requested_at > (lastDone.get(r.kind) ?? "")) lastDone.set(r.kind, r.requested_at);
  return runs.filter((r) => !r.dismissed_at && !(r.state === "failed" && r.requested_at < (lastDone.get(r.kind) ?? "")));
}

/** A sync is queued or running — the page refreshes itself until it finishes. */
export const isOpen = (r: SyncRun) => r.state === "requested" || r.state === "running";

/** Failures still worth a person's attention (the Registry's "Needs attention"). */
export const failedRuns = (runs: SyncRun[]) => visibleRuns(runs).filter((r) => r.state === "failed");

/** Finished or open syncs, newest first — the Registry's recent activity (failures are listed above). */
export const recentRuns = (runs: SyncRun[], n: number) => visibleRuns(runs).filter((r) => r.state !== "failed").slice(0, n);

/**
 * Automatic Sanity syncs paused by frames waiting for review (PROD-3203, 2026-10-28): while a sync
 * frame is a draft, an automatic run loads nothing (`result.skipped`), and nothing else on screen says
 * so — a deletion's frame stayed missing until someone ran Sync Changes. Per dataset whose newest
 * automatic run was skipped: since when (the oldest of that unbroken run of skips) and how many.
 */
export function pausedSyncs(runs: SyncRun[]): { dataset: string; since: string; skipped: number }[] {
  const byDataset = new Map<string, SyncRun[]>();
  for (const r of runs) {
    if (r.kind !== "sanity" || r.trigger !== "automatic" || r.state !== "done") continue;
    byDataset.set(r.dataset, [...(byDataset.get(r.dataset) ?? []), r]);
  }
  const out: { dataset: string; since: string; skipped: number }[] = [];
  for (const [dataset, list] of byDataset) {
    const newestFirst = [...list].sort((a, b) => b.requested_at.localeCompare(a.requested_at));
    const head = newestFirst.findIndex((r) => !r.result?.skipped);
    const streak = newestFirst.slice(0, head === -1 ? undefined : head);
    if (streak.length) out.push({ dataset, since: streak.at(-1)!.requested_at, skipped: streak.length });
  }
  return out;
}
