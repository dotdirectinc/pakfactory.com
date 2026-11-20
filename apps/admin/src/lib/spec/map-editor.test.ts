import { test } from "node:test";
import assert from "node:assert/strict";
import { draftErrors, draftOf, mapChanges, newProductType, productionOf, type MapDoc } from "./map-editor";

const doc: MapDoc = {
  revision: 3,
  targets: [{ productType: "PT-FC-ABL", setting: "Outside only", revision: 2 }],
  presets: [
    { label: "Coating", value: "Gloss", capability: "CAP-GLOSS", revision: 1 },
    { label: "Window", raw: "clear PET window" },
  ],
};
const item = {
  targets: [{ kind: "product_type" as const, sourceId: "PT-FC-ABL", name: "Auto Bottom", setting: "Outside only", version: 1 }],
  presets: [],
};

test("draft: names from the list, text-only presets keep their text", () => {
  const d = draftOf(doc, item);
  assert.deepEqual(d.targets, [{ ref: { kind: "productType", sourceId: "PT-FC-ABL", name: "Auto Bottom" }, setting: "Outside only" }]);
  assert.equal(d.presets[1]!.ref, null);
  assert.equal(d.presets[1]!.raw, "clear PET window");
});

test("round trip: the body equals the stored map without revisions", () => {
  assert.deepEqual(productionOf(draftOf(doc, item)), {
    targets: [{ productType: "PT-FC-ABL", setting: "Outside only" }],
    presets: [
      { label: "Coating", value: "Gloss", capability: "CAP-GLOSS" },
      { label: "Window", raw: "clear PET window" },
    ],
  });
  assert.deepEqual(mapChanges(draftOf(doc, item), draftOf(doc, item)), []);
});

test("a text-only preset given a capability drops its text (AC 4)", () => {
  const d = draftOf(doc, item);
  d.presets[1] = { ...d.presets[1]!, ref: { kind: "capability", sourceId: "CAP-WINPET", name: "PET window" } };
  assert.deepEqual(productionOf(d).presets[1], { label: "Window", capability: "CAP-WINPET" });
  assert.deepEqual(mapChanges(draftOf(doc, item), d).map((c) => c.what), ["Record of “Window”"]);
});

test("changes: product type swapped, preset removed (AC 1, 2)", () => {
  const before = draftOf(doc, item);
  const after = draftOf(doc, item);
  after.targets = [{ ref: { kind: "productType", sourceId: "PT-FC-RTE", name: "Reverse Tuck End" }, setting: "" }];
  after.presets.pop();
  const c = mapChanges(before, after);
  assert.deepEqual(c.map((x) => x.kind), ["changed", "removed"]);
  assert.match(c[0]!.before!, /Auto Bottom \(PT-FC-ABL\) = Outside only/);
  assert.match(c[0]!.after!, /Reverse Tuck End \(PT-FC-RTE\)/);
});

test("errors: a product maps to one product type; presets need labels", () => {
  const d = draftOf(doc, item);
  d.targets.push({ ref: { kind: "productType", sourceId: "PT-FC-RTE", name: null }, setting: "" });
  d.presets[0]!.label = " ";
  const e = draftErrors(d, "product");
  assert.ok(e.targets);
  assert.equal(e["preset 1"], "needs a label");
  assert.equal(draftErrors(draftOf(doc, item), "option")["target 1"], "must be a capability or field");
});

test("a new product type in export shape", () => {
  const t = newProductType({ id: "PT-FC-SLV", name: " Sleeve ", line: "CAT-FC", description: "" });
  assert.equal(t.code, "SLV");
  assert.equal(t.name, "Sleeve");
  assert.equal(t.categoryId, "CAT-FC");
});
