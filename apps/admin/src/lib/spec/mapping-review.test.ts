import { test } from "node:test";
import assert from "node:assert/strict";
import { groupMappings, visibilityOf, mappingHref, mappingParams, settingText, targetHref } from "./mapping-review";
import type { MappingItem } from "./registry-api";

const item = (id: number, group: string | null): MappingItem =>
  ({ id, group, subjectCode: `C${id}`, subjectName: `N${id}`, state: "pending" }) as MappingItem;

test("params: defaults, and unknown values fall back", () => {
  assert.deepEqual(mappingParams({}), { kind: "product", line: "CAT-FC", state: "open", label: null, search: null });
  assert.deepEqual(mappingParams({ kind: "option", line: "CAT-CB", state: "reject", label: "catch_all", search: "  tuck " }), {
    kind: "option", line: "CAT-CB", state: "reject", label: "catch_all", search: "tuck",
  });
  assert.deepEqual(mappingParams({ kind: "pg_class", line: "all", state: "x", label: "y" }), mappingParams({}));
});

test("href keeps only what differs from the defaults", () => {
  assert.equal(mappingHref({ kind: "product", line: "CAT-FC", state: "open" }), "/spec/mapping");
  assert.equal(mappingHref({ kind: "option", state: "all", label: "no_equivalent" }), "/spec/mapping?kind=option&state=all&label=no_equivalent");
});

test("a target links to its library record", () => {
  assert.equal(targetHref({ kind: "capability", sourceId: "CAP-STR-CRASH", version: 1 }), "/spec/library/1/capability/CAP-STR-CRASH");
});

test("groups keep the API order and put items without a group last", () => {
  const groups = groupMappings([item(1, "Lock Bottom Cartons"), item(2, null), item(3, "Lock Bottom Cartons"), item(4, "Tuck End Boxes")]);
  assert.deepEqual(groups.map((g) => [g.title, g.items.map((i) => i.id)]), [
    ["Lock Bottom Cartons", [1, 3]], ["Tuck End Boxes", [4]], [null, [2]],
  ]);
});

test("a setting that names its own field is shown as written", () => {
  assert.equal(settingText("Outside only"), "= Outside only");
  assert.equal(settingText("Grade = Anti-static"), "Grade = Anti-static");
});

test("within a group: on the website first, then internal, then the rest; group order unchanged", () => {
  const status: Record<number, string> = { 1: "active-internal", 2: "active", 3: "not-active", 4: "active", 5: "active-internal" };
  const groups = groupMappings(
    [item(1, "Tuck End Boxes"), item(2, "Tuck End Boxes"), item(3, "Tuck End Boxes"), item(4, "Tuck End Boxes"), item(5, "Lock Bottom Cartons")],
    (i) => status[i.id],
  );
  assert.deepEqual(groups.map((g) => g.title), ["Tuck End Boxes", "Lock Bottom Cartons"]);
  assert.deepEqual(groups[0]!.items.map((i) => i.id), [2, 4, 1, 3]);
  assert.equal(visibilityOf("active-internal"), "internal");
  assert.equal(visibilityOf(null), null);
});
