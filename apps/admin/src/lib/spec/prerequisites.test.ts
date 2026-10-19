import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedBy } from "./prerequisites";
import type { ChangesetSummary } from "./registry-api";

const frame = (frame: string, state: ChangesetSummary["state"], dependsOn: string[] = []): ChangesetSummary => ({
  id: frame, source: "sanity-sync", frame, state, summary: { dependsOn }, created_at: "", approved_by: null, approved_at: null,
});

// PROD-3114: the frame page passes only its prerequisites' approved frames; the Registry list passes every frame.
test("blockedBy gives the same answer from a set of approved frames as from the full list", () => {
  const cs = frame("c", "draft", ["a", "b"]);
  const all = [frame("a", "approved"), frame("b", "draft"), cs];
  assert.deepEqual(blockedBy(cs, all), ["b"]);
  assert.deepEqual(blockedBy(cs, new Set(["a"])), ["b"]);
  assert.deepEqual(blockedBy(cs, new Set(["a", "b"])), []);
});
