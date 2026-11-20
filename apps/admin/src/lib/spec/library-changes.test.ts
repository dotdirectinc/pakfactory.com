import { test } from "node:test";
import assert from "node:assert/strict";
import { approveAllPlan, baselinePlan, canDecideRow, changeGroups, recordBatches, routeOf, bundleIndex } from "./library-changes";
import type { LibraryBundleItem, ProductTypeChangeItem } from "./registry-api";

const b = (collection: LibraryBundleItem["collection"], sourceId: string, version = 1): LibraryBundleItem => ({
  collection, sourceId, label: sourceId, version, state: "pending", note: null, decidedAt: null, decidedByName: null, sharedBy: 1,
});
const c = (collection: ProductTypeChangeItem["collection"], sourceId: string, status: ProductTypeChangeItem["status"], extra: Partial<ProductTypeChangeItem> = {}): ProductTypeChangeItem => ({
  collection, sourceId, label: sourceId, status, sharedBy: 1, revision: 1, ...extra,
});

const bundle = [b("product_type", "PT-FC-RTE"), b("template", "TPL-FC-RTE", 2), b("capability", "CAP-A"), b("capability", "CAP-B", 2), b("capability", "CAP-C")];
const items = [
  c("capabilities", "CAP-A", "new", { sharedBy: 9 }),
  c("templates", "TPL-FC-RTE", "new"),
  c("capabilities", "CAP-B", "changed", { edit: 6 }),
  c("capabilities", "CAP-C", "changed", { changesetItem: 41 }),
  c("capabilities", "CAP-D", "removed", { edit: 7, sharedBy: 3 }),
  c("capabilities", "CAP-GONE", "new"),
];

test("a proposal goes to the edit, a held change to its item, the rest to the record's version", () => {
  const ix = bundleIndex(bundle);
  assert.deepEqual(routeOf(items[0]!, ix), { kind: "record", version: 1, collection: "capability", sourceId: "CAP-A" });
  assert.deepEqual(routeOf(items[1]!, ix), { kind: "record", version: 2, collection: "template", sourceId: "TPL-FC-RTE" });
  assert.deepEqual(routeOf(items[2]!, ix), { kind: "edit", edit: 6 });
  assert.deepEqual(routeOf(items[3]!, ix), { kind: "held", item: 41 });
  assert.deepEqual(routeOf(items[4]!, ix), { kind: "edit", edit: 7 }); // a retire proposal, not in the bundle
  assert.equal(routeOf(items[5]!, ix), null); // not in the bundle and nothing open: cannot be decided here
});

test("grouped new / changed / removed, with a record page where the bundle has the record", () => {
  const g = changeGroups(items, bundle);
  assert.deepEqual(g.new.map((r) => r.sourceId), ["TPL-FC-RTE", "CAP-A", "CAP-GONE"]); // templates before capabilities
  assert.deepEqual(g.changed.map((r) => r.sourceId), ["CAP-B", "CAP-C"]);
  assert.deepEqual(g.removed.map((r) => r.sourceId), ["CAP-D"]);
  assert.equal(g.new.find((r) => r.sourceId === "TPL-FC-RTE")!.recordHref, "/spec/library/2/template/TPL-FC-RTE");
  assert.equal(g.removed[0]!.recordHref, null);
});

test("only an admin decides proposals; review decides the rest", () => {
  const approver = { review: true, admin: false };
  const admin = { review: true, admin: true };
  const viewer = { review: false, admin: false };
  assert.equal(canDecideRow({ kind: "edit", edit: 1 }, approver), false);
  assert.equal(canDecideRow({ kind: "edit", edit: 1 }, admin), true);
  assert.equal(canDecideRow({ kind: "held", item: 1 }, approver), true);
  assert.equal(canDecideRow({ kind: "held", item: 1 }, viewer), false);
  assert.equal(canDecideRow(null, admin), false);
});

test("approve all listed counts what this person may decide, and the shared ones", () => {
  const g = changeGroups(items, bundle);
  assert.deepEqual(
    (({ count, shared }) => ({ count, shared }))(approveAllPlan(g, { review: true, admin: false })),
    { count: 3, shared: 1 }, // CAP-A (shared), TPL-FC-RTE, CAP-C; not the proposals, not CAP-GONE
  );
  assert.deepEqual(
    (({ count, shared }) => ({ count, shared }))(approveAllPlan(g, { review: true, admin: true })),
    { count: 5, shared: 2 },
  );
});

test("baseline approves new and changed records with nothing open, as the backend does", () => {
  assert.deepEqual(baselinePlan(changeGroups(items, bundle)), { records: 3, shared: 1, skipped: 3 });
});

test("record decisions batch by version; proposals and held changes are not batched", () => {
  const g = changeGroups(items, bundle);
  assert.deepEqual(recordBatches(approveAllPlan(g, { review: true, admin: true }).routes), [
    { version: 1, items: [{ collection: "capability", sourceId: "CAP-A" }] },
    { version: 2, items: [{ collection: "template", sourceId: "TPL-FC-RTE" }] },
  ]);
});

test("ordered: product type, templates by level, capabilities by group then name", () => {
  const withMeta: LibraryBundleItem[] = [
    { ...b("product_type", "PT-X"), label: "X" },
    { ...b("template", "TPL-X"), level: "type" },
    { ...b("template", "TPL-GLOBAL"), level: "global" },
    { ...b("capability", "CAP-Z"), label: "Zeta", group: { sourceId: "GRP-A", name: "Adhesives", sort: 1 } },
    { ...b("capability", "CAP-Y"), label: "Alpha", group: { sourceId: "GRP-F", name: "Finishes", sort: 2 } },
    { ...b("capability", "CAP-W"), label: "Beta", group: { sourceId: "GRP-A", name: "Adhesives", sort: 1 } },
  ];
  const list = [c("capabilities", "CAP-Y", "new"), c("capabilities", "CAP-Z", "new"), c("templates", "TPL-X", "new"),
    c("capabilities", "CAP-W", "new"), c("productTypes", "PT-X", "new"), c("templates", "TPL-GLOBAL", "new")];
  const g = changeGroups(list, withMeta);
  assert.deepEqual(g.new.map((r) => r.sourceId), ["PT-X", "TPL-GLOBAL", "TPL-X", "CAP-W", "CAP-Z", "CAP-Y"]);
  assert.deepEqual(g.new.map((r) => r.group), [null, null, null, "Adhesives", "Adhesives", "Finishes"]);
});
