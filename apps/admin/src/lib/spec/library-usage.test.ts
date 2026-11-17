import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByLine, productTypesHref, progressOf, reachedProductTypes, templateReach, viewOf } from "./library-usage";
import type { LibraryBundleItem, LibraryItem } from "./registry-api";

const pt = (sourceId: string): LibraryItem => ({
  sourceId, label: sourceId, state: "pending", note: null, decidedBy: null, decidedByName: null, decidedAt: null,
});

test("view: product types by default, records when a collection is asked for", () => {
  assert.equal(viewOf({}), "product-types");
  assert.equal(viewOf({ collection: "capability" }), "records");
  assert.equal(viewOf({ view: "records" }), "records");
  assert.equal(viewOf({ view: "product-types", collection: "capability" }), "product-types");
});

test("product types tab href keeps only what differs from the defaults", () => {
  assert.equal(productTypesHref(), "/spec/library");
  assert.equal(productTypesHref({ version: 1, line: "CAT-FC" }), "/spec/library");
  assert.equal(productTypesHref({ version: 2, line: "CAT-CB" }), "/spec/library?version=2&line=CAT-CB");
});

test("progress counts approved and open (pending + deferred) records", () => {
  const items = (["approve", "pending", "defer", "reject", "approve"] as const).map(
    (state, n) => ({ collection: "capability", sourceId: `C${n}`, state }) as LibraryBundleItem,
  );
  assert.deepEqual(progressOf({ items }), { total: 5, approve: 2, open: 2 });
});

test("a template reaches every product type, its line's, or its one product type", () => {
  const refs = {
    "cat-uuid": { collection: "category", sourceId: "CAT-FC", name: "Folding Cartons" },
    "pt-uuid": { collection: "product_type", sourceId: "PT-FC-STE", name: "Straight Tuck End" },
  };
  assert.deepEqual(templateReach({ level: "global" }, refs), { kind: "all" });
  assert.deepEqual(templateReach({ level: "category", category_id: "cat-uuid" }, refs), { kind: "line", line: "CAT-FC" });
  assert.deepEqual(templateReach({ level: "type", product_type_id: "pt-uuid" }, refs), { kind: "product_type", sourceId: "PT-FC-STE" });
  assert.equal(templateReach({ level: "category", category_id: "missing" }, refs), null);
  assert.equal(templateReach({ level: "type", product_type_id: "cat-uuid" }, refs), null, "a ref of the wrong kind does not count");
});

test("groups follow the line order and drop empty lines; reach filters by line or product type", () => {
  const groups = groupByLine([
    { line: "CAT-CB", items: [pt("PT-CB-RSC")] },
    { line: "CAT-RB", items: [] },
    { line: "CAT-FC", items: [pt("PT-FC-STE"), pt("PT-FC-RTE")] },
  ]);
  assert.deepEqual(groups.map((g) => [g.line, g.label, g.items.length]), [["CAT-FC", "Folding Cartons", 2], ["CAT-CB", "Corrugated Boxes", 1]]);
  assert.deepEqual(reachedProductTypes(groups, { lines: ["CAT-CB"] }).map((g) => g.line), ["CAT-CB"]);
  assert.deepEqual(
    reachedProductTypes(groups, { productType: "PT-FC-RTE" }).map((g) => g.items.map((i) => i.sourceId)),
    [["PT-FC-RTE"]],
  );
});
