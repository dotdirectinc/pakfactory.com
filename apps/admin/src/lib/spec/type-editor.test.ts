import { test } from "node:test";
import assert from "node:assert/strict";
import { editRights, editsOf, idParts, isNumberValue, newCapability, recordChanges, withParameterValues } from "./type-editor";
import type { SpecEdit } from "./registry-api";

test("changes: only fields that differ, never bookkeeping", () => {
  const before = { id: "PT-X", name: "Old", order: 2, updatedAt: "a", version: 1 };
  const after = { id: "PT-X", name: "New", order: 2, updatedAt: "b", version: 2 };
  assert.deepEqual(recordChanges(before, after), [{ key: "name", before: "Old", after: "New" }]);
  assert.deepEqual(recordChanges(null, { id: "CAP-N", name: "N" }).map((c) => c.key), ["id", "name"]);
});

test("numbers: digits with sign and decimals", () => {
  for (const v of ["3", "-2.5", " 10 ", 4]) assert.equal(isNumberValue(v), true, String(v));
  for (const v of ["≈3.0", "3mm", "", null, "1,000"]) assert.equal(isNumberValue(v), false, String(v));
});

test("parameter values: a number stays a number, keeping its type; text is free", () => {
  const params = [
    { key: "gsm", label: "Weight", unit: "gsm", value: "350" },
    { key: "count", value: 4 },
    { key: "thickness", unit: "mm", value: "≈3.0" },
  ];
  const ok = withParameterValues(params, { gsm: "400", count: "6", thickness: "about 3" });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.params.map((p) => p.value), ["400", 6, "about 3"]);
  const bad = withParameterValues(params, { gsm: "heavy" });
  assert.deepEqual(bad, { ok: false, errors: { gsm: "must be a number" } });
});

test("a new capability is in one line, in export shape", () => {
  const c = newCapability({ id: "CAP-QA-NEW", name: " New one ", groupId: "GRP-QA", line: "CAT-FC", description: "" });
  assert.equal(c.name, "New one");
  assert.deepEqual(c.applicableCategories, ["CAT-FC"]);
  assert.deepEqual(c.parameters, []);
  assert.deepEqual(idParts("Gloss foil, extra-wide"), ["gloss", "foil", "extra"]);
});

test("edit rights: owned by the Spec System and allowed to edit (AC 6, 7)", () => {
  assert.deepEqual(editRights({ productTypes: "spec_library", capabilities: "spec_system" }, true),
    { productTypes: false, capabilities: true, any: true });
  assert.deepEqual(editRights({ productTypes: "spec_system", capabilities: "spec_system" }, false),
    { productTypes: false, capabilities: false, any: false });
  assert.equal(editRights(null, true).any, false);
});

test("edits of the listed records only", () => {
  const e = (id: number, collection: SpecEdit["collection"], sourceId: string, subject: SpecEdit["subject"] = "record") =>
    ({ id, subject, collection, sourceId }) as SpecEdit;
  const out = editsOf([e(3, "capabilities", "CAP-A"), e(2, "capabilities", "CAP-B"), e(1, "productTypes", "PT-X"), e(4, null, "x", "map")],
    new Set(["capabilities/CAP-A", "productTypes/PT-X"]));
  assert.deepEqual(out.map((x) => x.id), [3, 1]);
});
