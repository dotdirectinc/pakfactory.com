import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChangesetItem } from "./registry-api";
import { compareImpact, editsOfFrame } from "./frame-edits";

const doc = (target_ref: string, ops: unknown[], over: Partial<ChangesetItem> = {}): ChangesetItem => ({
  id: target_ref, seq: 1, entity_type: "sanity_document", op: "update", target_id: null, deterministic_key: "k",
  target_ref, payload: { ops }, ...over,
});

describe("editsOfFrame — a frame's edits, rebuilt from its Sanity items", () => {
  it("offers, exceptions and a compatible pair (written on both options, one edit)", () => {
    const edits = editsOfFrame([
      doc("prod-1", [
        { field: "availableCustomizations", kind: "upsert", match: { at: "customization", ref: "opt-a" } },
        { field: "availableCustomizations", kind: "remove", match: { at: "customization", ref: "opt-b" } },
        { field: "customizationExceptions", kind: "upsert", match: { at: "customization", ref: "opt-c", mode: "add" }, item: { reason: "fits" } },
        { field: "customizationExceptions", kind: "remove", match: { at: "customization", ref: "opt-d", mode: "remove" } },
      ]),
      doc("opt-a", [{ field: "compatibleCustomizations", kind: "upsert", match: { at: "self", ref: "opt-e" } }]),
      doc("opt-e", [{ field: "compatibleCustomizations", kind: "upsert", match: { at: "self", ref: "opt-a" } }]),
      { ...doc("x", []), entity_type: "product_offer" },
    ]);
    assert.deepEqual(edits, [
      { kind: "offer", productId: "prod-1", optionId: "opt-a", offered: true },
      { kind: "offer", productId: "prod-1", optionId: "opt-b", offered: false },
      { kind: "exception", productId: "prod-1", optionId: "opt-c", mode: "add", reason: "fits" },
      { kind: "exception", productId: "prod-1", optionId: "opt-d", mode: "remove", reason: null },
      { kind: "pair", a: "opt-a", b: "opt-e", compatible: true },
    ]);
  });

  it("a type's settings (one edit) and its requirements", () => {
    const edits = editsOfFrame([
      doc("type-1", [
        { field: "availabilityDecidedBy", kind: "set", value: "customization" },
        { field: "customerSelects", kind: "set", value: "many" },
        { field: "dependsOn", kind: "set", value: [{ _type: "requirement", anyOf: [{ _type: "reference", _ref: "type-2" }, { _ref: "cat-1" }] }] },
      ]),
    ]);
    assert.deepEqual(edits, [
      { kind: "typeSettings", typeId: "type-1", decidedBy: "customization", customerSelects: "many" },
      { kind: "requirements", typeId: "type-1", groups: [["type-2", "cat-1"]] },
    ]);
  });
});

describe("compareImpact — now against when submitted", () => {
  const saved = { totals: { products: 1, gained: 1, lost: 0 }, warnings: ["w1"], products: [{ title: "Mailer", gained: ["Matte"], lost: [] }] };
  it("the same impact is the same", () => {
    const r = compareImpact(saved, { totals: { products: 1, gained: 1, lost: 0 }, warnings: ["w1"], errors: [], products: [{ title: "Mailer", gained: ["Matte"], lost: [] }] });
    assert.equal(r.same, true);
  });
  it("names the products whose change differs, those no longer changed, and new warnings", () => {
    const r = compareImpact(saved, {
      totals: { products: 1, gained: 0, lost: 1 }, warnings: ["w1", "w2"], errors: [],
      products: [{ title: "Pouch", gained: [], lost: ["Gloss"] }],
    });
    assert.deepEqual(r, { same: false, changedProducts: ["Pouch"], noLongerChanged: ["Mailer"], newWarnings: ["w2"] });
  });
  it("a blocking error now is never the same", () => {
    assert.equal(compareImpact(saved, { ...saved, totals: saved.totals, warnings: ["w1"], errors: ["bad"], products: saved.products }).same, false);
  });
});
