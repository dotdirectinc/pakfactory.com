import { test } from "node:test";
import assert from "node:assert/strict";
import { bundleSections, decisionBatches, defaultSelection, isOpen, keyOf, sortBundle, stateCounts, templateLevelLabel } from "./library-bundle";
import type { LibraryBundleItem } from "./registry-api";

const it = (collection: LibraryBundleItem["collection"], sourceId: string, extra: Partial<LibraryBundleItem> = {}): LibraryBundleItem => ({
  collection, sourceId, label: sourceId, version: 1, state: "pending", note: null, decidedAt: null, decidedByName: null, sharedBy: 1, ...extra,
});

const items = [
  it("product_type", "PT-FC-STE"),
  it("template", "TPL-GLOBAL", { level: "global", sharedBy: 44 }),
  it("template", "TPL-FC", { level: "category", sharedBy: 9, version: 2 }),
  it("template", "TPL-FC-STE", { level: "type" }),
  it("capability", "CAP-MAT-CCNB", { sharedBy: 17, group: { sourceId: "GRP-MAT", name: "Materials", sort: 1 } }),
  it("capability", "CAP-PRT-OFF", { sharedBy: 9, state: "approve", group: { sourceId: "GRP-PRT", name: "Printing", sort: 2 } }),
  it("capability", "CAP-MAT-ONLY", { state: "defer", group: { sourceId: "GRP-MAT", name: "Materials", sort: 1 } }),
  it("capability", "CAP-MAT-NO", { state: "reject", group: { sourceId: "GRP-MAT", name: "Materials", sort: 1 } }),
];

test("open = pending or deferred", () => {
  assert.deepEqual(items.filter(isOpen).map((i) => i.sourceId), ["PT-FC-STE", "TPL-GLOBAL", "TPL-FC", "TPL-FC-STE", "CAP-MAT-CCNB", "CAP-MAT-ONLY"]);
});

test("the dialog ticks only open records owned by this product type", () => {
  assert.deepEqual([...defaultSelection(items)].sort(), ["capability/CAP-MAT-ONLY", "product_type/PT-FC-STE", "template/TPL-FC-STE"]);
});

test("one decision call per library version, closed records never sent", () => {
  const picked = new Set(["product_type/PT-FC-STE", "template/TPL-FC", "capability/CAP-PRT-OFF", "capability/CAP-MAT-NO"]);
  assert.deepEqual(decisionBatches(items, picked), [
    { version: 1, items: [{ collection: "product_type", sourceId: "PT-FC-STE" }] },
    { version: 2, items: [{ collection: "template", sourceId: "TPL-FC" }] },
  ]);
  assert.deepEqual(decisionBatches(items, new Set()), []);
});

test("sections: product type, templates, then capability groups", () => {
  const s = bundleSections(items);
  assert.deepEqual(s.map((x) => [x.title, x.items.length]), [["Product type", 1], ["Templates", 3], ["Materials", 3], ["Printing", 1]]);
});

test("display order does not depend on the backend's order", () => {
  const shuffled = [items[7]!, items[5]!, items[3]!, items[0]!, items[6]!, items[1]!, items[4]!, items[2]!,
    it("capability", "CAP-ZZ-NOGROUP")];
  assert.deepEqual(sortBundle(shuffled).map((i) => i.sourceId), [
    "PT-FC-STE", "TPL-GLOBAL", "TPL-FC", "TPL-FC-STE", "CAP-MAT-CCNB", "CAP-MAT-NO", "CAP-MAT-ONLY", "CAP-PRT-OFF", "CAP-ZZ-NOGROUP",
  ]);
  assert.deepEqual(bundleSections(shuffled).map((s) => s.title), ["Product type", "Templates", "Materials", "Printing", "Other capabilities"]);
});

test("group sort is numeric, not text", () => {
  const g = (sourceId: string, sort: number) => it("capability", sourceId, { group: { sourceId: `G${sort}`, name: `G${sort}`, sort } });
  assert.deepEqual(sortBundle([g("CAP-B", 10), g("CAP-A", 9)]).map((i) => i.sourceId), ["CAP-A", "CAP-B"]);
});

test("counts and labels", () => {
  assert.deepEqual(stateCounts(items), { pending: 5, approve: 1, reject: 1, defer: 1 });
  assert.equal(keyOf(items[0]!), "product_type/PT-FC-STE");
  assert.equal(templateLevelLabel("category"), "Product line");
});
