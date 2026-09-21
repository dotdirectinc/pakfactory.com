import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveForProduct, type DependencyGraph } from "./resolve.ts";
import type { Catalog, ProductDoc } from "./index.ts";

// The chain the board actually draws, at its smallest:
//   Product decides Material · Material decides Printing Method ·
//   Printing Method decides Colour System
//
// Offset works on SBS, Digital works on Kraft, CMYK works on Offset only. So a
// product offering just SBS keeps Offset and CMYK; one offering just Kraft keeps
// Digital and loses CMYK — which is the cascade, not a single pass.
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
    { _id: "o.cmyk", title: "CMYK", typeId: "t.colour", compatibleCustomizations: ["o.offset"] },
  ],
});

const graph: DependencyGraph = {
  dependsOn: { "t.method": ["t.material"], "t.colour": ["t.method"] },
};

const productWith = (...optionIds: string[]): ProductDoc => ({
  _id: "p.test",
  availableCustomizations: optionIds.map((optionId) => ({ optionId })),
});

test("a method survives when the product offers a material it works on", () => {
  const r = resolveForProduct(catalog(), productWith("o.sbs"), graph);
  assert.deepEqual(r.availableByType.get("t.method"), ["o.offset"]);
});

test("removing the material removes the method, and then the colour that needed it", () => {
  // The point of the fixpoint: CMYK has no direct relationship to a material.
  // It goes only because Offset went first.
  const r = resolveForProduct(catalog(), productWith("o.kraft"), graph);
  assert.deepEqual(r.availableByType.get("t.method"), ["o.digital"]);
  assert.equal(r.availableByType.get("t.colour"), undefined);
  assert.deepEqual(
    r.removed.map((x) => x.optionId),
    ["o.offset", "o.cmyk"],
  );
  assert.ok(r.iterations > 1, "a cascade needs more than one pass");
});

test("a product offering no material offers no printing at all", () => {
  const r = resolveForProduct(catalog(), productWith(), graph);
  assert.equal(r.availableByType.get("t.method"), undefined);
  assert.equal(r.availableByType.get("t.colour"), undefined);
});

test("the removal says which dependency could not be satisfied", () => {
  const r = resolveForProduct(catalog(), productWith("o.kraft"), graph);
  const offset = r.removed.find((x) => x.optionId === "o.offset");
  assert.deepEqual(offset?.unsatisfied, ["t.material"]);
});

// ── all-of across dependencies, any-of within one ────────────────────────────

test("a type depending on two others needs a partner in BOTH", () => {
  const input = catalog();
  input.types.push({ _id: "t.spot", title: "Spot Coating", availabilityDecidedBy: "customization" });
  input.types.push({ _id: "t.finish", title: "Surface Finish", availabilityDecidedBy: "customization" });
  input.options.push({ _id: "o.matte", title: "Matte", typeId: "t.finish", compatibleCustomizations: ["o.sbs"] });
  // Spot UV pairs with a material, but with nothing in Surface Finish.
  input.options.push({ _id: "o.spotUv", title: "Spot UV", typeId: "t.spot", compatibleCustomizations: ["o.sbs"] });
  const twoDeps: DependencyGraph = {
    dependsOn: { ...graph.dependsOn, "t.finish": ["t.material"], "t.spot": ["t.material", "t.finish"] },
  };

  const r = resolveForProduct(input, productWith("o.sbs"), twoDeps);
  assert.deepEqual(r.availableByType.get("t.finish"), ["o.matte"]);
  assert.equal(r.availableByType.get("t.spot"), undefined);
  assert.deepEqual(r.removed.find((x) => x.optionId === "o.spotUv")?.unsatisfied, ["t.finish"]);
});

test("one partner in a dependency is enough, not all of them", () => {
  const r = resolveForProduct(catalog(), productWith("o.sbs", "o.kraft"), graph);
  // Offset pairs with SBS only, and that is sufficient.
  assert.deepEqual(r.availableByType.get("t.method"), ["o.offset", "o.digital"]);
});

// ── the places it deliberately does not fail closed ──────────────────────────

test("a customization-decided type with no dependency declared keeps its options, and says so", () => {
  // Nothing states what gates it, so removing everything would be a guess. This
  // is the gap `customizationType.dependsOn` (PROD-2558) closes.
  const r = resolveForProduct(catalog(), productWith("o.sbs"), { dependsOn: { "t.method": ["t.material"] } });
  assert.deepEqual(r.unconstrainedTypes, ["t.colour"]);
  assert.deepEqual(r.availableByType.get("t.colour"), ["o.cmyk"]);
});

test("a dependency naming a type that is not in the catalog is reported and ignored", () => {
  const r = resolveForProduct(catalog(), productWith("o.sbs"), {
    dependsOn: { "t.method": ["t.material", "t.gone"], "t.colour": ["t.method"] },
  });
  assert.deepEqual(r.unknownDependencies, ["t.gone"]);
  assert.deepEqual(r.availableByType.get("t.method"), ["o.offset"]);
});

// ── termination ──────────────────────────────────────────────────────────────

test("a dependency cycle terminates instead of looping", () => {
  const r = resolveForProduct(catalog(), productWith("o.sbs"), {
    dependsOn: { "t.method": ["t.colour"], "t.colour": ["t.method"] },
  });
  assert.ok(r.iterations <= catalog().options.length + 1);
  // Offset and CMYK hold each other up; neither is removed, and nothing hangs.
  assert.deepEqual(r.availableByType.get("t.colour"), ["o.cmyk"]);
});

test("product-decided types are never touched by the cascade", () => {
  const r = resolveForProduct(catalog(), productWith("o.sbs", "o.kraft"), graph);
  assert.deepEqual(r.availableByType.get("t.material"), ["o.sbs", "o.kraft"]);
});
