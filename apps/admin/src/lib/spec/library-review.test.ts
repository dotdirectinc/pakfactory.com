import { test } from "node:test";
import assert from "node:assert/strict";
import { collectionLabel, displayValue, isCollection, listHref, noteRequired, pageOf, stateOf, totals, LIBRARY_COLLECTIONS } from "./library-review";

test("14 collections, matching the backend's", () => {
  assert.equal(LIBRARY_COLLECTIONS.length, 14);
  assert.ok(isCollection("material_grade"));
  assert.ok(!isCollection("pg_class"));
  assert.equal(collectionLabel("rule_test"), "Rule examples");
});

test("state, page and href defaults", () => {
  assert.equal(stateOf(undefined), "pending");
  assert.equal(stateOf("nope"), "pending");
  assert.equal(stateOf("defer"), "defer");
  assert.equal(pageOf("3"), 3);
  for (const bad of ["0", "-1", "1.5", "x", undefined]) assert.equal(pageOf(bad), 1);
  assert.equal(listHref({ version: 1, collection: "rule" }), "/spec/library?version=1&collection=rule");
  assert.equal(
    listHref({ version: 1, collection: "rule", state: "all", search: "bub", page: 2 }),
    "/spec/library?version=1&collection=rule&state=all&search=bub&page=2",
  );
});

test("totals: deferred still blocks approval", () => {
  const t = totals([
    { collection: "rule", total: 10, pending: 2, approve: 5, reject: 1, defer: 2 },
    { collection: "field", total: 5, pending: 0, approve: 5, reject: 0, defer: 0 },
  ]);
  assert.deepEqual(t, { total: 15, pending: 2, approve: 10, reject: 1, defer: 2, open: 4, decided: 11 });
});

test("note rule and display", () => {
  assert.equal(noteRequired("approve"), false);
  assert.equal(noteRequired("reject"), true);
  assert.equal(noteRequired("defer"), true);
  assert.equal(displayValue(null), "—");
  assert.equal(displayValue(5.5), "5.5");
  assert.equal(displayValue({ a: 1 }), '{\n  "a": 1\n}');
});
