import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChangesetItem } from "./registry-api";
import { pendingRulesOf } from "./pending-rules";

const item = (over: Partial<ChangesetItem>): ChangesetItem => ({
  id: "i", seq: 1, entity_type: "sanity_document", op: "update", target_id: null, deterministic_key: "k",
  target_ref: "prod-1", apply_state: null, excluded_at: null, payload: {}, ...over,
});

describe("pendingRulesOf", () => {
  it("marks each field a waiting frame changes on the record, with the entries it touches, newest frame first", () => {
    const p = pendingRulesOf("prod-1", [
      { id: "old", created_at: "2026-10-14T10:00:00Z", items: [item({ payload: { ops: [{ field: "availableCustomizations", kind: "upsert", match: { at: "customization", ref: "opt-a" } }] } })] },
      { id: "new", created_at: "2026-10-15T10:00:00Z", items: [item({ payload: { ops: [
        { field: "availableCustomizations", kind: "remove", match: { at: "customization", ref: "opt-b" } },
        { field: "customizationExceptions", kind: "upsert", match: { at: "customization", ref: "opt-c", mode: "add" } },
      ] } })] },
    ]);
    assert.deepEqual(p.availableCustomizations!.frames.map((f) => f.id), ["new", "old"]);
    assert.deepEqual(p.availableCustomizations!.refs.sort(), ["opt-a", "opt-b"]);
    assert.deepEqual(p.customizationExceptions!.refs, ["opt-c"]);
  });

  it("leaves out other records, excluded rows and writes already made", () => {
    const p = pendingRulesOf("prod-1", [
      { id: "f", created_at: "2026-10-15T10:00:00Z", items: [
        item({ target_ref: "prod-2", payload: { ops: [{ field: "availableCustomizations" }] } }),
        item({ excluded_at: "2026-10-15T11:00:00Z", payload: { ops: [{ field: "customizationExceptions" }] } }),
        item({ apply_state: "applied", payload: { ops: [{ field: "compatibleCustomizations" }] } }),
        item({ entity_type: "product_offer", payload: { ops: [{ field: "dependsOn" }] } }),
      ] },
    ]);
    assert.deepEqual(p, {});
  });

  it("a whole-value field (a type's settings) has no entries", () => {
    const p = pendingRulesOf("type-1", [
      { id: "f", created_at: "2026-10-15T10:00:00Z", items: [item({ target_ref: "type-1", payload: { ops: [{ field: "customerSelects", kind: "set", value: "many" }] } })] },
    ]);
    assert.deepEqual(p.customerSelects, { frames: [{ id: "f", at: "2026-10-15T10:00:00Z" }], refs: [] });
  });
});
