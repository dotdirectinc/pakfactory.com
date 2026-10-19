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
