import { test } from "node:test";
import assert from "node:assert/strict";
import { isEmpty, labelOf, ruleConditions, ruleOutcomes, shapeOf, splitFields, tableColumns, titleOf } from "./library-display";

test("labels read as words", () => {
  assert.equal(labelOf("group_id"), "Group");
  assert.equal(labelOf("data_type"), "Data type");
  assert.equal(labelOf("applicableCategories"), "Applicable categories");
  assert.equal(labelOf("regionalRecords"), "Regional records");
  assert.equal(labelOf("material_family"), "Material family");
});

test("value shapes", () => {
  assert.equal(shapeOf(null).kind, "empty");
  assert.equal(shapeOf("").kind, "empty");
  assert.equal(shapeOf({}).kind, "empty");
  assert.equal(shapeOf({ a: null }).kind, "empty");
  assert.equal(shapeOf(true).kind, "bool");
  assert.equal(shapeOf("CAP-MAT-SBS").kind, "ref");
  assert.equal(shapeOf("a0f8aef3-31b8-447e-afa4-3e02e5874fbe").kind, "ref");
  assert.equal(shapeOf("Crash-lock gluing").kind, "text");
  assert.equal(shapeOf("2026-10-09T12:00:00Z").kind, "date");
  assert.equal(shapeOf(["CAT-FC", "CAT-CB"]).kind, "chips");
  assert.equal(shapeOf({ food: "No", sides: "C1S" }).kind, "map");
  const t = shapeOf([{ id: "x", category: "CAT-FC", note: null, stock: null }, { id: "y", category: "CAT-PB", note: "Inserts", stock: null }]);
  assert.equal(t.kind, "table");
  if (t.kind === "table") assert.deepEqual(t.columns, ["category", "note"]);
});

test("fields split into lead, content, empty and system", () => {
  const r = { name: "N", description: "D", kind: "standard", unit: "", notes: "", group_id: "g", source_keys: ["id"], created_at: "x", constraints: [] };
  const s = splitFields(r);
  assert.deepEqual(s.lead, [["description", "D"]]);
  assert.deepEqual(s.content.map(([k]) => k), ["kind", "group_id"]);
  assert.deepEqual(s.empty, ["constraints", "notes", "unit"]);
  assert.deepEqual(s.system.map(([k]) => k).sort(), ["created_at", "source_keys"]);
  assert.equal(titleOf(r, "CAP-X"), "N");
  assert.equal(titleOf({}, "CAP-X"), "CAP-X");
  assert.deepEqual(tableColumns([{ id: 1, sort: 2, a: null, b: 1 }]), ["b"]);
  assert.ok(isEmpty("  "));
});

test("rule logic as conditions and outcomes", () => {
  const body = {
    when: { match: "all", conditions: [{ op: "selected", field: null, value: "CAP-MAT-CCNB" }, { op: "eq", field: "FLD-GEN-USE", value: "Food" }] },
    pairs: null,
    alternatives: ["CAP-MAT-SBS", "CAP-MAT-FBB"],
    appliesTo: [],
  };
  const w = ruleConditions(body);
  assert.equal(w?.match, "all");
  assert.deepEqual(w?.conditions[0], { subject: "CAP-MAT-CCNB", op: "is selected", value: "CAP-MAT-CCNB", showValue: false });
  assert.deepEqual(w?.conditions[1], { subject: "FLD-GEN-USE", op: "is", value: "Food", showValue: true });
  assert.deepEqual(ruleOutcomes(body), [["Suggest instead", ["CAP-MAT-SBS", "CAP-MAT-FBB"]]]);
  assert.equal(ruleConditions({}), null);
});
