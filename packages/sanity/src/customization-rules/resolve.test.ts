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

// ── a type that ends with nothing at all ─────────────────────────────────────

test("a type emptied by a dependency is NAMED, not just missing", () => {
  // Kraft only. Offset needs SBS, so Printing Method loses everything, and Colour System
  // follows it. Both are absent from availableByType — which on its own is indistinguishable
  // from a catalogue that never had them.
  const r = resolveForProduct(catalog(), productWith("o.kraft"), {
    dependsOn: { "t.method": ["t.material"], "t.colour": ["t.method"] },
  });
  assert.equal(r.availableByType.get("t.colour"), undefined);
  const colour = r.emptiedTypes.find((e) => e.typeId === "t.colour");
  assert.deepEqual(colour, { typeId: "t.colour", had: 1, unsatisfied: ["t.method"] });
});

test("a type the product simply never offered is NOT reported as emptied", () => {
  // Seeded empty is ordinary — the product offers no material of that type. Reporting it
  // would bury the real signal under noise on every product in the catalogue.
  const bare: Catalog = { types: catalog().types, options: [] };
  const r = resolveForProduct(bare, { _id: "p.bare", availableCustomizations: [] }, graph);
  assert.deepEqual(r.emptiedTypes, []);
});

test("nothing is emptied when the rules settle normally", () => {
  const r = resolveForProduct(catalog(), productWith("o.sbs"), graph);
  assert.deepEqual(r.emptiedTypes, []);
});

test("THE SIBLING TRAP: a dependency on its own category empties the type", () => {
  // Crystal's worry, in code. Embossing & Debossing and Foiling Technique are both dictated
  // by Material and are never wired to each other. That is fine — they do not gate each other.
  // It stops being fine the moment Embossing is authored as depending on its own CATEGORY,
  // because that expands to its siblings, and Embossing has never named a Foiling option.
  const finishing: Catalog = {
    types: [
      { _id: "t.material", title: "Material", availabilityDecidedBy: "product" },
      { _id: "t.emboss", title: "Embossing & Debossing", availabilityDecidedBy: "customization" },
      { _id: "t.foil", title: "Foiling Technique", availabilityDecidedBy: "customization" },
    ],
    options: [
      { _id: "o.sbs", title: "SBS", typeId: "t.material" },
      { _id: "o.blind", title: "Blind Emboss", typeId: "t.emboss", compatibleCustomizations: ["o.sbs"] },
      { _id: "o.hot", title: "Hot Foil", typeId: "t.foil", compatibleCustomizations: ["o.sbs"] },
    ],
  };
  const product: ProductDoc = { _id: "p.box", availableCustomizations: [{ optionId: "o.sbs" }] };

  // Drawn as the board states it: each gated by Material only. Both survive.
  const ok = resolveForProduct(finishing, product, { dependsOn: { "t.emboss": ["t.material"], "t.foil": ["t.material"] } });
  assert.deepEqual(ok.availableByType.get("t.emboss"), ["o.blind"]);
  assert.deepEqual(ok.availableByType.get("t.foil"), ["o.hot"]);
  assert.deepEqual(ok.emptiedTypes, []);

  // Authored with the sibling as a dependency: Embossing is wiped out — and says so.
  const trap = resolveForProduct(finishing, product, { dependsOn: { "t.emboss": ["t.foil"] } });
  assert.equal(trap.availableByType.get("t.emboss"), undefined);
  assert.deepEqual(trap.emptiedTypes, [{ typeId: "t.emboss", had: 1, unsatisfied: ["t.foil"] }]);
});
