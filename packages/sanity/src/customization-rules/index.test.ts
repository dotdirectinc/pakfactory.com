import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCompatibilityIndex,
  eligibleOptions,
  offersForProduct,
  type Catalog,
} from "./index.ts";

// A small catalog with one type of each kind. Paperboard is a MATERIAL (the
// product decides), Spot UV is a FINISH (the material it goes on decides) — the
// same pair the board states, so the fixtures read like the rules do.
const catalog = (): Catalog => ({
  types: [
    { _id: "type.paperboard", title: "Paperboard", availabilityDecidedBy: "product" },
    { _id: "type.spotCoating", title: "Spot Coating", availabilityDecidedBy: "customization" },
  ],
  options: [
    { _id: "opt.sbs", title: "SBS", typeId: "type.paperboard" },
    { _id: "opt.kraft", title: "White Kraft", typeId: "type.paperboard" },
    { _id: "opt.spotUv", title: "Spot UV", typeId: "type.spotCoating", compatibleCustomizations: ["opt.sbs"] },
    { _id: "opt.spotGlitter", title: "Spot Glitter", typeId: "type.spotCoating" },
  ],
});

// ── reading the field both ways ──────────────────────────────────────────────
// "Recording it on either option is enough", so a read that only trusted the
// stored list would miss half the pairs.

test("a pair recorded on one option is compatible from both sides", () => {
  const { pairs } = buildCompatibilityIndex(catalog().options);
  assert.deepEqual([...(pairs.get("opt.spotUv") ?? [])], ["opt.sbs"]);
  assert.deepEqual([...(pairs.get("opt.sbs") ?? [])], ["opt.spotUv"]);
});

test("a reference to a document that is not in the catalog is reported, not silently dropped", () => {
  const input = catalog();
  input.options[2].compatibleCustomizations = ["opt.sbs", "opt.deleted"];
  const { pairs, dangling } = buildCompatibilityIndex(input.options);
  assert.deepEqual(dangling, ["opt.spotUv → opt.deleted"]);
  assert.deepEqual([...(pairs.get("opt.spotUv") ?? [])], ["opt.sbs"]);
});

test("an option that references itself is dropped and reported", () => {
  const input = catalog();
  input.options[2].compatibleCustomizations = ["opt.spotUv", "opt.sbs"];
  const { pairs, selfReferences } = buildCompatibilityIndex(input.options);
  assert.deepEqual(selfReferences, ["opt.spotUv"]);
  assert.ok(!pairs.get("opt.spotUv")?.has("opt.spotUv"));
});

// ── the empties rule (PROD-2534) ─────────────────────────────────────────────
// The decision this package is built on, and the one place the two halves of
// `availabilityDecidedBy` must behave differently.

test("a customization-decided option with nothing recorded is compatible with nothing", () => {
  const { eligible, compatibleWithNothing } = eligibleOptions(catalog());
  assert.ok(!eligible.has("opt.spotGlitter"));
  assert.deepEqual(compatibleWithNothing, ["opt.spotGlitter"]);
});

test("a customization-decided option with a pair is eligible", () => {
  const { eligible } = eligibleOptions(catalog());
  assert.ok(eligible.has("opt.spotUv"));
});

test("a PRODUCT-decided option with nothing recorded is still eligible", () => {
  // The distinction that keeps the catalog alive: materials and Additional
  // Customization are gated by the product's own list, not by compatibility, so
  // failing closed on an empty list here would remove them from everywhere.
  const { eligible, compatibleWithNothing } = eligibleOptions(catalog());
  assert.ok(eligible.has("opt.kraft"));
  assert.ok(!compatibleWithNothing.includes("opt.kraft"));
});

test("an option whose type is missing is excluded and named", () => {
  const input = catalog();
  input.options.push({ _id: "opt.orphan", typeId: "type.gone" });
  const { eligible, unknownType } = eligibleOptions(input);
  assert.deepEqual(unknownType, ["opt.orphan"]);
  assert.ok(!eligible.has("opt.orphan"));
});

// ── what one product offers (PROD-2529) ──────────────────────────────────────

test("a product offers exactly the options it lists, grouped by type", () => {
  const { offers } = offersForProduct(catalog(), {
    _id: "product.folding-carton",
    availableCustomizations: [{ optionId: "opt.kraft" }, { optionId: "opt.sbs" }],
  });
  assert.equal(offers.length, 1);
  assert.equal(offers[0].type._id, "type.paperboard");
  // Catalog order, not the order the product happens to list them in.
  assert.deepEqual(offers[0].optionIds, ["opt.sbs", "opt.kraft"]);
});

test("a type the product lists nothing for is not offered", () => {
  const { offers } = offersForProduct(catalog(), { _id: "product.bare" });
  assert.deepEqual(offers, []);
});

test("an option the product has no business listing is ignored and named", () => {
  // The picker cannot produce this; a script or a push from the product data
  // source can, and trusting it would let a product claim a finish is its own.
  const { offers, notTheProductsToChoose } = offersForProduct(catalog(), {
    _id: "product.odd",
    availableCustomizations: [{ optionId: "opt.sbs" }, { optionId: "opt.spotUv" }],
  });
  assert.deepEqual(notTheProductsToChoose, ["opt.spotUv"]);
  assert.deepEqual(offers.map((o) => o.type._id), ["type.paperboard"]);
});

test("a listed option that no longer exists is ignored and named", () => {
  const { offers, unknownOptions } = offersForProduct(catalog(), {
    _id: "product.stale",
    availableCustomizations: [{ optionId: "opt.sbs" }, { optionId: "opt.deleted" }],
  });
  assert.deepEqual(unknownOptions, ["opt.deleted"]);
  assert.deepEqual(offers[0].optionIds, ["opt.sbs"]);
});

test("the same option listed twice is offered once", () => {
  const { offers } = offersForProduct(catalog(), {
    _id: "product.dupe",
    availableCustomizations: [{ optionId: "opt.sbs" }, { optionId: "opt.sbs" }],
  });
  assert.deepEqual(offers[0].optionIds, ["opt.sbs"]);
});
