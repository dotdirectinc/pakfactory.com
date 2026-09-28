import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeRules, type SummaryCatalog, type SummaryProduct } from "./summary.ts";
import { buildDependencyGraph } from "./dependencies.ts";
import { resolveForProduct } from "./resolve.ts";

// The board's chain, with one of each thing the summary has to tell apart:
//   Materials (a CATEGORY of two types) decides Printing Method, together with Ink
//   (two requirements). Printing Method decides Colour System (a type entry).
//   Embossing is customization-decided with no requirement — unconstrained.
//   Spot UV is paired with nothing — compatible with nothing.
const catalog = (): SummaryCatalog => ({
  categories: [{ _id: "c.materials", title: "Materials" }],
  types: [
    { _id: "t.paperboard", title: "Paperboard", availabilityDecidedBy: "product", categoryId: "c.materials" },
    { _id: "t.metal", title: "Metal", availabilityDecidedBy: "product", categoryId: "c.materials" },
    { _id: "t.ink", title: "Ink", availabilityDecidedBy: "product", customerSelects: "many" },
    {
      _id: "t.method",
      title: "Printing Method",
      availabilityDecidedBy: "customization",
      requirements: [["c.materials"], ["t.ink"]],
    },
    { _id: "t.colour", title: "Colour System", availabilityDecidedBy: "customization", requirements: [["t.method"]] },
    { _id: "t.emboss", title: "Embossing", availabilityDecidedBy: "customization" },
    { _id: "t.spot", title: "Spot Coating", availabilityDecidedBy: "customization", requirements: [["t.nope"]] },
  ],
  options: [
    { _id: "o.sbs", typeId: "t.paperboard" },
    { _id: "o.kraft", typeId: "t.paperboard" },
    { _id: "o.cardstock", typeId: "t.paperboard" },
    { _id: "o.tin", typeId: "t.metal" },
    { _id: "o.soy", typeId: "t.ink" },
    { _id: "o.metallic", typeId: "t.ink", configuratorRole: "reference" },
    // Offset: two of three paperboards and soy ink → "all but Cardstock".
    { _id: "o.offset", typeId: "t.method", compatibleCustomizations: ["o.sbs", "o.kraft", "o.soy"] },
    // Screen: tin only — it has no partner in Ink, so it can never be offered.
    { _id: "o.screen", typeId: "t.method", compatibleCustomizations: ["o.tin"] },
    { _id: "o.cmyk", typeId: "t.colour", compatibleCustomizations: ["o.offset", "o.metallic"] },
    { _id: "o.deboss", typeId: "t.emboss", compatibleCustomizations: ["o.sbs", "o.gone"] },
    { _id: "o.spotuv", typeId: "t.spot" },
  ],
});

const product = (id: string, available: string[], exceptions: SummaryProduct["customizationExceptions"] = []): SummaryProduct => ({
  _id: id,
  availableCustomizations: available.map((optionId) => ({ optionId })),
  customizationExceptions: exceptions,
});

const products = (): SummaryProduct[] => [
  product("p.box", ["o.sbs", "o.soy"]),
  product("p.tin", ["o.tin", "o.soy"]),
  product("p.kraft", ["o.kraft", "o.soy"], [{ optionId: "o.offset", mode: "remove", reason: "press too small" }]),
];

const summary = () => summarizeRules({ catalog: catalog(), products: products() });
const type = (id: string) => summary().types.find((t) => t.typeId === id)!;
const option = (id: string) => summary().options.find((o) => o.optionId === id)!;

test("requirements keep the editor's wording: category and type entries, AND across rows", () => {
  assert.deepEqual(type("t.method").requirements, [
    [{ kind: "category", id: "c.materials" }],
    [{ kind: "type", id: "t.ink" }],
  ]);
  // …and the groups are what the rules check: the category is ONE group of its members.
  assert.deepEqual(type("t.method").groups, [["t.metal", "t.paperboard"], ["t.ink"]]);
});

test("each type says how it is decided, including the states that read like answers", () => {
  assert.equal(type("t.paperboard").state, "product");
  assert.equal(type("t.method").state, "constrained");
  assert.equal(type("t.emboss").state, "unconstrained");
  assert.equal(type("t.spot").state, "resolves-to-nothing");
  assert.deepEqual(type("t.spot").requirements, [[{ kind: "unknown", id: "t.nope" }]]);
});

test("customerSelects defaults to one, as the rest of the package reads it", () => {
  assert.equal(type("t.method").customerSelects, "one");
  assert.equal(type("t.ink").customerSelects, "many");
});

test("partners are grouped by type with an all / all-but / some reading", () => {
  const offset = option("o.offset");
  const paperboard = offset.partners.find((p) => p.typeId === "t.paperboard")!;
  assert.equal(paperboard.coverage, "all-but");
  assert.deepEqual(paperboard.missing, ["o.cardstock"]);
  assert.deepEqual(paperboard.partnerIds, ["o.sbs", "o.kraft"]);

  const ink = offset.partners.find((p) => p.typeId === "t.ink")!;
  assert.equal(ink.coverage, "some", "one of two is not 'all but'");
  assert.equal(ink.missing, undefined);

  const screen = option("o.screen").partners.find((p) => p.typeId === "t.metal")!;
  assert.equal(screen.coverage, "all");
});

test("each partner group says which way the dependency runs", () => {
  const offset = option("o.offset");
  assert.equal(offset.partners.find((p) => p.typeId === "t.paperboard")!.relation, "requirement");
  assert.equal(offset.partners.find((p) => p.typeId === "t.colour")!.relation, "dependent");
  // Requirement types come first, whatever the catalog order.
  assert.deepEqual(offset.partners.map((p) => p.relation), ["requirement", "requirement", "dependent"]);

  const deboss = option("o.deboss");
  assert.equal(deboss.partners[0].relation, "other", "an unconstrained type's pairs only mean 'together'");
});

test("an option with no partner in one requirement is flagged, not silently dropped", () => {
  // Screen pairs with tin but no ink: requirement 1 (Ink) can never be met.
  assert.deepEqual(option("o.screen").unpairedRequirements, [1]);
  assert.equal(option("o.screen").status, "offered-nowhere");
  assert.deepEqual(option("o.offset").unpairedRequirements, []);
});

test("reach counts match resolveForProduct product by product, exceptions included", () => {
  const s = summary();
  const graph = buildDependencyGraph(catalog());
  const expected = new Map<string, number>();
  for (const p of products()) {
    for (const ids of resolveForProduct(catalog(), p, graph).availableByType.values()) {
      for (const id of ids) expected.set(id, (expected.get(id) ?? 0) + 1);
    }
  }
  for (const o of s.options) assert.equal(o.productCount, expected.get(o.optionId) ?? 0, o.optionId);

  // Offset: on the SBS box; the kraft box would have it but removes it.
  assert.equal(option("o.offset").productCount, 1);
  assert.equal(option("o.offset").removedByException, 1);
  assert.equal(type("t.method").productsOffering, 1);
  // CMYK cascades with Offset.
  assert.equal(option("o.cmyk").productCount, 1);
});

test("empty fails closed: an option paired with nothing is never offered", () => {
  assert.equal(option("o.spotuv").status, "compatible-with-nothing");
  assert.equal(option("o.spotuv").productCount, 0);
});

test("an add exception counts as reach and says so", () => {
  const s = summarizeRules({
    catalog: catalog(),
    products: [product("p.tin", ["o.tin", "o.soy"], [{ optionId: "o.spotuv", mode: "add", reason: "sample run" }])],
  });
  const spot = s.options.find((o) => o.optionId === "o.spotuv")!;
  assert.equal(spot.productCount, 1);
  assert.equal(spot.addedByException, 1);
  assert.equal(spot.status, "offered");
  assert.deepEqual(s.exceptions.map((e) => [e.productId, e.effect]), [["p.tin", "added"]]);
});

test("exceptions that do nothing are listed with their product", () => {
  const s = summarizeRules({
    catalog: catalog(),
    products: [product("p.box", ["o.sbs", "o.soy"], [
      { optionId: "o.screen", mode: "remove" },
      { optionId: "o.sbs", mode: "add" },
    ])],
  });
  assert.deepEqual(
    s.exceptions.map((e) => [e.productId, e.optionId, e.effect]),
    [["p.box", "o.screen", "redundant"], ["p.box", "o.sbs", "product-decided"]],
  );
});

test("diagnostics: dangling references, sibling pairs in a pick-one type, reference-role pairs", () => {
  const c = catalog();
  c.options.push({ _id: "o.digital", typeId: "t.method", compatibleCustomizations: ["o.offset", "o.digital"] });
  const s = summarizeRules({ catalog: c, products: [] });
  assert.deepEqual(s.diagnostics.danglingReferences, ["o.deboss → o.gone"]);
  assert.deepEqual(s.diagnostics.selfReferences, ["o.digital"]);
  assert.deepEqual(s.diagnostics.siblingPairs, [["o.digital", "o.offset"]]);
  assert.deepEqual(s.diagnostics.referencePairs, [["o.cmyk", "o.metallic"]]);
  assert.deepEqual(s.diagnostics.unknownDependencyReferences, ["t.nope"]);
});

test("totals count each pair once", () => {
  const s = summary();
  // offset–sbs, offset–kraft, offset–soy, screen–tin, cmyk–offset, cmyk–metallic, deboss–sbs
  assert.equal(s.totals.pairs, 7);
  assert.equal(s.totals.products, 3);
  assert.equal(s.totals.exceptions, 1);
});
