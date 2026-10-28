import { test } from "node:test";
import assert from "node:assert/strict";
import { failedRuns, pausedSyncs, recentRuns } from "./sync-runs";
import type { SyncRun } from "./registry-api";

const run = (id: string, state: SyncRun["state"], at: string, extra: Partial<SyncRun> = {}): SyncRun => ({
  id, kind: "sanity", dataset: "development", state, requested_by: null, requested_at: at,
  started_at: null, finished_at: null, error: null, result: null, ...extra,
});

// PROD-3115: the Registry splits runs into "needs attention" (failures) and recent activity.
test("a failure shows until a later run of its kind succeeds, or someone dismisses it", () => {
  const runs = [run("new", "done", "2026-10-19T03"), run("old-fail", "failed", "2026-10-19T02"), run("x", "done", "2026-10-19T01")];
  assert.deepEqual(failedRuns(runs), []);
  const failing = [run("fail", "failed", "2026-10-19T03"), run("d", "done", "2026-10-19T02")];
  assert.deepEqual(failedRuns(failing).map((r) => r.id), ["fail"]);
  assert.deepEqual(failedRuns([run("f", "failed", "2026-10-19T03", { dismissed_at: "now" })]), []);
});

test("recent activity skips failures and keeps at most n, newest first as given", () => {
  const runs = [run("a", "running", "4"), run("b", "failed", "3"), run("c", "done", "2"), run("d", "done", "1"), run("e", "done", "0")];
  assert.deepEqual(recentRuns(runs, 3).map((r) => r.id), ["a", "c", "d"]);
});

test("automatic syncs are paused while the newest automatic run per dataset was skipped (PROD-3203)", () => {
  const auto = (id: string, at: string, skipped: boolean, dataset = "development") =>
    run(id, "done", at, { trigger: "automatic", dataset, result: skipped ? { skipped: "frames waiting for review" } : {} });
  const runs = [
    auto("a3", "2026-10-28T03", true), auto("a2", "2026-10-28T02", true), auto("a1", "2026-10-28T01", false), auto("a0", "2026-10-28T00", true),
    run("manual", "done", "2026-10-28T04", { trigger: "manual", result: {} }),
    auto("p1", "2026-10-28T02", false, "production"),
  ];
  assert.deepEqual(pausedSyncs(runs), [{ dataset: "development", since: "2026-10-28T02", skipped: 2 }]);
  // The next automatic run that loads again ends it.
  assert.deepEqual(pausedSyncs([auto("a4", "2026-10-28T05", false), ...runs]), []);
});
