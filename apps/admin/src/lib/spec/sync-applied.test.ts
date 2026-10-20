import { test } from "node:test";
import assert from "node:assert/strict";
import { describeApplied, fieldChanges } from "./sync-applied";

// PROD-3119: Sync history and record pages say what Sync Changes applied, in a reviewer's words.
test("a property link names the record and the value gained or lost", () => {
  assert.deepEqual(
    describeApplied({ entity_type: "option_property_value", op: "retire", title: "White Kraft Paper Wrap: White", before: null, after: null }),
    { record: "White Kraft Paper Wrap", what: "Removed White" },
  );
  assert.deepEqual(
    describeApplied({ entity_type: "product_property_value", op: "insert", title: "Paper Tray: Food-Safe", before: null, after: null }),
    { record: "Paper Tray", what: "Added Food-Safe" },
  );
});

test("a field change reads old → new, by the field's name", () => {
  assert.deepEqual(
    describeApplied({ entity_type: "product", op: "update", title: "Tray & Sleeve Box", before: { slug: "tray-and-sleeve-box" }, after: { slug: "tray-sleeve-box" } }),
    { record: "Tray & Sleeve Box", what: "Slug: tray-and-sleeve-box → tray-sleeve-box" },
  );
  assert.deepEqual(fieldChanges({ name: "Box", status: "active" }, { status: "not-active" }), ["Status: active → not-active"]);
});

test("facts read as label and value, internal ones left out; unchanged fields are not listed", () => {
  const before = { label: "Black", facts: [{ label: "thickness", value: 0.3 }, { label: "basisWeight", value: 200, shown: false }] };
  const after = { label: "Black", facts: [{ label: "thickness", value: 0.25 }, { label: "basisWeight", value: 200, shown: false }] };
  assert.deepEqual(fieldChanges(before, after), ["Facts: thickness 0.3 → thickness 0.25"]);
});
