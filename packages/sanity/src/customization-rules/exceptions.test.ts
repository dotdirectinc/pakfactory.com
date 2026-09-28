import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveForProduct, type DependencyGraph } from "./resolve.ts";
import type { Catalog, CustomizationException, ProductDoc } from "./index.ts";

// PROD-2595 — customizationExceptions, both directions, on the chain the board draws:
//   Product decides Material · Material decides Printing Method · Method decides Colour
//
// Offset works on SBS, Digital works on Kraft. CMYK works on Offset; Spot works on Digital.
// Foil works on nothing at all.
const catalog = (): Catalog => ({
  types: [
    { _id: "t.material", title: "Paperboard", availabilityDecidedBy: "product" },
    { _id: "t.method", title: "Printing Method", availabilityDecidedBy: "customization" },
    { _id: "t.colour", title: "Colour System", availabilityDecidedBy: "customization" },
  ],
  options: [
    { _id: "o.sbs", title: "SBS", typeId: "t.material" },
    { _id: "o.kraft", title: "White Kraft", typeId: "t.material" },
    { _id: "o.offset", title: "Offset", typeId: "t.method", compatibleCustomizations: ["o.sbs"] },
    { _id: "o.digital", title: "Digital", typeId: "t.method", compatibleCustomizations: ["o.kraft"] },
    { _id: "o.foil", title: "Foil Print", typeId: "t.method" },
    { _id: "o.cmyk", title: "CMYK", typeId: "t.colour", compatibleCustomizations: ["o.offset"] },
    { _id: "o.spot", title: "Spot", typeId: "t.colour", compatibleCustomizations: ["o.digital"] },
  ],
});

const graph: DependencyGraph = {
  dependsOn: { "t.method": ["t.material"], "t.colour": ["t.method"] },
};

/** A product offering SBS only, with the given exceptions. */
const sbsWith = (...customizationExceptions: CustomizationException[]): ProductDoc => ({
  _id: "p.test",
  availableCustomizations: [{ optionId: "o.sbs" }],
  customizationExceptions,
});

const add = (optionId: string, reason = "confirmed with production"): CustomizationException =>
  ({ optionId, mode: "add", reason });
const remove = (optionId: string, reason = "cannot be made on this box"): CustomizationException =>
  ({ optionId, mode: "remove", reason });

test("without exceptions the rules alone decide, and nothing is reported", () => {
  const r = resolveForProduct(catalog(), sbsWith(), graph);
  assert.deepEqual(r.availableByType.get("t.method"), ["o.offset"]);
  assert.deepEqual(r.availableByType.get("t.colour"), ["o.cmyk"]);
  assert.deepEqual(r.exceptions, []);
});

test("remove takes a derived option out, and what depended on it cascades out too", () => {
  const r = resolveForProduct(catalog(), sbsWith(remove("o.offset")), graph);
  assert.equal(r.availableByType.get("t.method"), undefined);
  assert.equal(r.availableByType.get("t.colour"), undefined, "CMYK only paired with Offset");
  assert.equal(r.exceptions[0]!.effect, "removed");
  assert.equal(r.exceptions[0]!.reason, "cannot be made on this box");
});

test("add puts in an option the rules did not derive, and the rules never take it back", () => {
  const r = resolveForProduct(catalog(), sbsWith(add("o.digital")), graph);
  assert.deepEqual(r.availableByType.get("t.method"), ["o.offset", "o.digital"]);
  const outcome = r.exceptions[0]!;
  assert.equal(outcome.effect, "added");
  assert.deepEqual(outcome.rulesSaid, { unsatisfied: ["t.material"] }, "the reviewer sees why the rules said no");
});

test("an added option is a real partner: what depends on it can now appear", () => {
  const without = resolveForProduct(catalog(), sbsWith(), graph);
  assert.ok(!(without.availableByType.get("t.colour") ?? []).includes("o.spot"));
  const r = resolveForProduct(catalog(), sbsWith(add("o.digital")), graph);
  assert.deepEqual(r.availableByType.get("t.colour"), ["o.cmyk", "o.spot"]);
});

test("adding an option with no compatible pairs at all says so", () => {
  const r = resolveForProduct(catalog(), sbsWith(add("o.foil")), graph);
  assert.ok(r.availableByType.get("t.method")!.includes("o.foil"));
  assert.equal(r.exceptions[0]!.rulesSaid, "no-pairs");
});

test("an exception that repeats what the rules already say is redundant, and changes nothing", () => {
  const r = resolveForProduct(catalog(), sbsWith(add("o.offset"), remove("o.digital")), graph);
  assert.deepEqual(r.exceptions.map((e) => e.effect), ["redundant", "redundant"]);
  assert.deepEqual(r.availableByType.get("t.method"), ["o.offset"]);
});

test("a product-decided option cannot take an exception — the product already lists it or not", () => {
  const r = resolveForProduct(catalog(), sbsWith(add("o.kraft"), remove("o.sbs")), graph);
  assert.deepEqual(r.exceptions.map((e) => e.effect), ["product-decided", "product-decided"]);
  assert.deepEqual(r.availableByType.get("t.material"), ["o.sbs"], "the list is untouched");
});

test("the same option both added and removed is a conflict, and neither applies", () => {
  const r = resolveForProduct(catalog(), sbsWith(add("o.offset"), remove("o.offset")), graph);
  assert.deepEqual(r.exceptions.map((e) => e.effect), ["conflict", "conflict"]);
  assert.deepEqual(r.availableByType.get("t.method"), ["o.offset"]);
});

test("an exception naming no option is reported and ignored", () => {
  const r = resolveForProduct(catalog(), sbsWith(add("o.nope")), graph);
  assert.equal(r.exceptions[0]!.effect, "unknown-option");
});

test("each derived option says which partner in each dependency keeps it", () => {
  const r = resolveForProduct(catalog(), sbsWith(), graph);
  assert.deepEqual(r.derivedBecause.get("o.offset"), [{ typeId: "t.material", partners: ["o.sbs"] }]);
  assert.deepEqual(r.derivedBecause.get("o.cmyk"), [{ typeId: "t.method", partners: ["o.offset"] }]);
});

test("an option kept by an add exception has no derived reason — the exception is the reason", () => {
  const r = resolveForProduct(catalog(), sbsWith(add("o.digital")), graph);
  assert.deepEqual(r.derivedBecause.get("o.digital"), []);
  assert.deepEqual(r.derivedBecause.get("o.spot"), [{ typeId: "t.method", partners: ["o.digital"] }]);
});

test("exceptions change this product only — another product's answer is unaffected", () => {
  const other: ProductDoc = { _id: "p.other", availableCustomizations: [{ optionId: "o.sbs" }] };
  resolveForProduct(catalog(), sbsWith(remove("o.offset")), graph);
  const r = resolveForProduct(catalog(), other, graph);
  assert.deepEqual(r.availableByType.get("t.method"), ["o.offset"]);
});
