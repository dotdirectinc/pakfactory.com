import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  CATALOG_CUSTOMIZATION_DETAIL_QUERY,
  CATALOG_PRODUCT_BY_SLUG_QUERY,
  CATALOG_PRODUCT_LINE_BY_SLUG_QUERY,
} from "./catalog.ts";
import { PAGE_SECTIONS_PROJECTION } from "./sections.ts";
import { SOLUTION_BY_SLUG_QUERY } from "./solutions.ts";

// An editor's pick never outranks the target's status. Curated lists — related and
// featured products, products rows, inspirations cards — use the same gates as the
// automatic lists, including a product's parents (rule 1) and its line (R1).

const ref = (id: string) => ({ _type: "reference", _ref: id, _key: id });
const product = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id, _type: "product", kind: "standard", title: id, slug: { current: id },
  productLine: { _ref: "line" }, productStyle: [{ _ref: "style" }], ...extra,
});

const base = [
  { _id: "line", _type: "productLine", title: "Line", slug: { current: "line" }, status: "active" },
  { _id: "line-off", _type: "productLine", title: "Off line", slug: { current: "line-off" }, status: "not-active" },
  { _id: "style", _type: "productStyle", title: "Style", slug: { current: "style" }, productLine: { _ref: "line" } },
  { _id: "style-off", _type: "productStyle", title: "Off style", slug: { current: "style-off" }, productLine: { _ref: "line" }, status: "not-active" },
  { _id: "sol", _type: "solution", title: "Sol", slug: { current: "sol" }, status: "active" },
  { _id: "sol-off", _type: "solution", title: "Off sol", slug: { current: "sol-off" }, status: "not-active" },
  { _id: "ss", _type: "solutionStyle", title: "SS", slug: { current: "ss" }, solution: { _ref: "sol" }, status: "active" },
  { _id: "ss-off", _type: "solutionStyle", title: "SS off", slug: { current: "ss-off" }, solution: { _ref: "sol" }, status: "not-active" },
  product("ok"),
  product("own-off", { status: "not-active" }),
  product("internal", { status: "active-internal" }),
  product("all-styles-off", { productStyle: [{ _ref: "style-off" }] }),
  product("line-off-p", { productLine: { _ref: "line-off" } }),
];
const PICKS = ["ok", "own-off", "internal", "all-styles-off", "line-off-p"].map(ref);

async function run(query: string, dataset: unknown[], params: Record<string, unknown> = {}) {
  return (await (await evaluate(parse(query), { dataset: dataset as never, params })).get()) as any;
}
const slugs = (rows: { slug?: string }[] | null | undefined) => (rows ?? []).map((r) => r.slug);

test("PDP related products keep only listable picks", async () => {
  const pdp = await run(CATALOG_PRODUCT_BY_SLUG_QUERY, [...base, product("host", { relatedProducts: PICKS })], { slug: "host" });
  assert.deepEqual(slugs(pdp.relatedProducts), ["ok"]);
});

test("line featured products keep only listable picks", async () => {
  const dataset = base.map((d) => (d._id === "line" ? { ...d, featuredProducts: PICKS } : d));
  const line = await run(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, dataset, { slug: "line" });
  assert.deepEqual(slugs(line.featuredProducts), ["ok"]);
});

test("solution related and featured products keep only listable picks", async () => {
  const dataset = base.map((d) => (d._id === "sol" ? { ...d, relatedProducts: PICKS, featuredProducts: PICKS } : d));
  const sol = await run(SOLUTION_BY_SLUG_QUERY, dataset, { slug: "sol" });
  assert.deepEqual(slugs(sol.relatedProducts), ["ok"]);
  assert.deepEqual(slugs(sol.featuredProducts), ["ok"]);
});

test("products rows and inspirations cards drop hidden targets; typed cards stay", async () => {
  const page = {
    _id: "page", _type: "contentPage",
    sections: [
      { _key: "pr", _type: "productsRow", curatedItems: PICKS },
      {
        _key: "ig", _type: "inspirationsGrid",
        cards: [
          { _key: "t", _type: "inspirationsCard", title: "Typed" },
          ref("ok"), ref("own-off"), ref("style"), ref("style-off"), ref("ss"), ref("ss-off"),
        ],
      },
    ],
  };
  const doc = await run(`*[_id == "page"][0]{"sections": sections[]${PAGE_SECTIONS_PROJECTION}}`, [...base, page]);
  const row = doc.sections.find((s: { _type: string }) => s._type === "productsRow");
  assert.deepEqual(slugs(row.items), ["ok"]);
  const grid = doc.sections.find((s: { _type: string }) => s._type === "inspirationsGrid");
  assert.deepEqual(
    grid.cards.map((c: { title?: string }) => c.title),
    ["Typed", "ok", "Style", "SS"],
  );
});

test("'See it in use' showcase never links a solution that is not Active", async () => {
  const dataset = [
    ...base,
    {
      _id: "opt", _type: "customizationOption", title: "Opt", slug: { current: "opt" }, status: "active",
      appearsIn: "configurable-with-page", type: { _ref: "type" },
    },
    { _id: "type", _type: "customizationType", title: "T", category: { _ref: "cat" } },
    { _id: "cat", _type: "customizationCategory", title: "C", slug: { current: "cat" } },
    product("tagged", {
      solutions: [ref("sol"), ref("sol-off")],
      availableCustomizations: [{ _key: "a", customization: { _ref: "opt" } }],
    }),
  ];
  const detail = await run(CATALOG_CUSTOMIZATION_DETAIL_QUERY, dataset, { handle: "opt", category: "cat" });
  assert.deepEqual(slugs(detail.showcaseFromSolutions), ["sol"]);
});
