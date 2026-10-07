import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  filterParams,
  keywordPattern,
  productMatchesSolutionStyleFilter,
  solutionStyleProductFilter,
  solutionStyleQueryParams,
  titleMatchesKeywordPattern,
  type SolutionStyleMatchProduct,
} from "./solution-style-filter.ts";

// The expression is a string until Sanity reads it, so a typo only shows up as a failed page.
// `count(productStyle[._ref in $styleIds])` shipped that way and broke every collection with a
// style condition (PROD-2605). Every test here parses the query — and runs it — with groq-js.

const products = [
  // The tagged solutions must exist and be Active: an inspiration product whose every
  // solution is off is hidden (rule 1, 2026-10-06).
  { _id: "sol", _type: "solution", title: "Bakery", status: "active" },
  { _id: "other", _type: "solution", title: "Other", status: "active" },
  // Presets follow their base product (2026-10-06), so each needs one that is live.
  { _id: "p.base", _type: "product", kind: "standard", title: "Base", productLine: { _ref: "line.box" }, productStyle: [{ _ref: "style.tuck" }] },
  { _id: "p.box", _type: "product", kind: "inspiration", basedOn: { _ref: "p.base" }, title: "Cookie Box", solutions: [{ _ref: "sol" }], productLine: { _ref: "line.box" }, productStyle: [{ _ref: "style.tuck" }] },
  { _id: "p.bag", _type: "product", kind: "inspiration", basedOn: { _ref: "p.base" }, title: "Paper Bakery Bag", solutions: [{ _ref: "sol" }], productLine: { _ref: "line.bag" }, productStyle: [{ _ref: "style.gusset" }, { _ref: "style.handle" }] },
  { _id: "p.other", _type: "product", kind: "inspiration", basedOn: { _ref: "p.base" }, title: "Cookie Tin", solutions: [{ _ref: "other" }], productLine: { _ref: "line.box" }, productStyle: [{ _ref: "style.tuck" }] },
  { _id: "p.std", _type: "product", kind: "standard", title: "Cookie Box Standard", solutions: [{ _ref: "sol" }], productLine: { _ref: "line.box" }, productStyle: [{ _ref: "style.tuck" }] },
  { _id: "p.hidden", _type: "product", kind: "inspiration", basedOn: { _ref: "p.base" }, title: "Cookie Box Hidden", status: "active-internal", solutions: [{ _ref: "sol" }], productLine: { _ref: "line.box" }, productStyle: [{ _ref: "style.tuck" }] },
  { _id: "p.soon", _type: "product", kind: "inspiration", basedOn: { _ref: "p.base" }, title: "Tin Soon", status: "coming-soon", solutions: [{ _ref: "sol" }], productLine: { _ref: "line.soon" }, productStyle: [{ _ref: "style.tuck" }] },
  { _id: "p.gone", _type: "product", kind: "inspiration", basedOn: { _ref: "p.base" }, title: "Tin Gone", status: "discontinued", solutions: [{ _ref: "sol" }], productLine: { _ref: "line.soon" }, productStyle: [{ _ref: "style.tuck" }] },
];

const ids = async (filter: Parameters<typeof filterParams>[1], excluded: { _ref: string }[] = []) => {
  const p = filterParams("sol", filter, excluded);
  const expr = solutionStyleProductFilter(p);
  assert.ok(expr, "a filter with a condition builds an expression");
  const tree = parse(`*[${expr}] | order(_id asc)._id`); // throws on a syntax error
  const result = await evaluate(tree, { dataset: products, params: solutionStyleQueryParams(p) });
  return result.get();
};

test("a product-style condition parses and matches any of the product's styles", async () => {
  assert.deepEqual(await ids({ productStyles: [{ _ref: "style.handle" }] }), ["p.bag"]);
});

test("a product-line condition matches the line", async () => {
  assert.deepEqual(await ids({ productLines: [{ _ref: "line.box" }] }), ["p.box"]);
});

test("a keyword matches the title, last word as a prefix", async () => {
  assert.deepEqual(await ids({ keywords: ["Bakery Bag"] }), ["p.bag"]);
  assert.deepEqual(await ids({ keywords: ["cookie"] }), ["p.box"]);
});

test("the three conditions widen the collection (OR), never narrow it", async () => {
  assert.deepEqual(
    await ids({ productLines: [{ _ref: "line.box" }], productStyles: [{ _ref: "style.gusset" }] }),
    ["p.bag", "p.box"],
  );
});

test("scoped to the parent solution and to inspiration products", async () => {
  // p.other is in another solution; p.std is a standard product — both match the line.
  assert.deepEqual(await ids({ productLines: [{ _ref: "line.box" }] }), ["p.box"]);
});

test("a product held off the site (active-internal) is never listed", async () => {
  assert.ok(!(await ids({ productLines: [{ _ref: "line.box" }] })).includes("p.hidden"));
  assert.ok(!(await ids({ keywords: ["Cookie"] })).includes("p.hidden"));
});

test("coming soon is listed; discontinued keeps its page but is not listed", async () => {
  assert.deepEqual(await ids({ productLines: [{ _ref: "line.soon" }] }), ["p.soon"]);
});

test("an excluded product stays out", async () => {
  assert.deepEqual(await ids({ productLines: [{ _ref: "line.box" }], productStyles: [{ _ref: "style.gusset" }] }, [{ _ref: "p.box" }]), ["p.bag"]);
});

test("no condition builds no query at all", () => {
  assert.equal(solutionStyleProductFilter(filterParams("sol", {}, [])), null);
});

test("keywordPattern adds the prefix wildcard to the last word only", () => {
  assert.equal(keywordPattern("pizza box"), "pizza box*");
  assert.equal(keywordPattern("   "), null);
});

const matchProduct = (
  overrides: Partial<SolutionStyleMatchProduct> = {},
): SolutionStyleMatchProduct => ({
  id: "p.box",
  kind: "inspiration",
  title: "Cookie Box",
  solutionIds: ["sol"],
  lineId: "line.box",
  styleIds: ["style.tuck"],
  ...overrides,
});

test("productMatchesSolutionStyleFilter mirrors line / style / keyword OR", () => {
  const lineOnly = filterParams("sol", { productLines: [{ _ref: "line.box" }] }, []);
  assert.equal(productMatchesSolutionStyleFilter(matchProduct(), lineOnly), true);
  assert.equal(
    productMatchesSolutionStyleFilter(matchProduct({ lineId: "line.other" }), lineOnly),
    false,
  );

  const styleOnly = filterParams("sol", { productStyles: [{ _ref: "style.handle" }] }, []);
  assert.equal(
    productMatchesSolutionStyleFilter(
      matchProduct({ styleIds: ["style.gusset", "style.handle"] }),
      styleOnly,
    ),
    true,
  );

  const kw = filterParams("sol", { keywords: ["Bakery Bag"] }, []);
  assert.equal(
    productMatchesSolutionStyleFilter(
      matchProduct({ title: "Paper Bakery Bag", lineId: null, styleIds: [] }),
      kw,
    ),
    true,
  );
});

test("productMatchesSolutionStyleFilter respects solution, kind, exclusion", () => {
  const p = filterParams("sol", { productLines: [{ _ref: "line.box" }] }, [{ _ref: "p.box" }]);
  assert.equal(productMatchesSolutionStyleFilter(matchProduct(), p), false);
  assert.equal(
    productMatchesSolutionStyleFilter(
      matchProduct({ kind: "standard" }),
      filterParams("sol", { productLines: [{ _ref: "line.box" }] }, []),
    ),
    false,
  );
  assert.equal(
    productMatchesSolutionStyleFilter(
      matchProduct({ solutionIds: ["other"] }),
      filterParams("sol", { productLines: [{ _ref: "line.box" }] }, []),
    ),
    false,
  );
});

test("titleMatchesKeywordPattern treats the last token as a prefix", () => {
  assert.equal(titleMatchesKeywordPattern("Paper Bakery Bag", "Bakery Bag*"), true);
  assert.equal(titleMatchesKeywordPattern("Cookie Box", "cookie*"), true);
  assert.equal(titleMatchesKeywordPattern("Cookie Box", "Tin*"), false);
});
