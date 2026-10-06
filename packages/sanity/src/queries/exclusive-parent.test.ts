import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  CATALOG_CUSTOMIZATION_DETAIL_QUERY,
  CATALOG_CUSTOMIZATION_LIBRARY_QUERY,
  CATALOG_CUSTOMIZATION_RULES_QUERY,
  CATALOG_OPTION_BY_ID_QUERY,
  CATALOG_PRODUCT_BY_SLUG_QUERY,
  CATALOG_PRODUCT_LIBRARY_QUERY,
} from "./catalog.ts";

// R1 — exclusive parent: where a child names exactly ONE parent, it is never more
// visible than that parent (Sanity Document Visibility sheet, Cascade Rules tab).

const line = (id: string, status?: string) => ({
  _id: id, _type: "productLine", title: id, slug: { current: id }, ...(status ? { status } : {}),
});
const style = (id: string) => ({
  _id: id, _type: "productStyle", title: id, slug: { current: id }, productLine: { _ref: "l-active" },
});
const product = (slug: string, lineId: string, extra: Record<string, unknown> = {}) => ({
  _id: slug, _type: "product", kind: "standard", title: slug, slug: { current: slug },
  productLine: { _ref: lineId }, productStyle: [{ _ref: "s" }], ...extra,
});

const catalog = [
  line("l-active", "active"), line("l-unset"), line("l-soon", "coming-soon"),
  line("l-off", "not-active"), line("l-gone", "discontinued"), line("l-internal", "active-internal"),
  style("s"),
  { _id: "sol", _type: "solution", title: "Sol", slug: { current: "sol" }, status: "active" },
  product("p-active", "l-active"), product("p-unset", "l-unset"), product("p-soon", "l-soon"),
  product("p-off", "l-off"), product("p-gone", "l-gone"), product("p-internal", "l-internal"),
  // Inspiration products borrow their line through basedOn; their anchor is solutions.
  product("i-off-line", "l-off", { kind: "inspiration", solutions: [{ _ref: "sol" }] }),
];

async function run(query: string, dataset: unknown[], params: Record<string, unknown> = {}) {
  return (await evaluate(parse(query), { dataset, params })).get();
}

test("R1 product → line: Coming soon and Not active lines hide their products", async () => {
  for (const slug of ["p-soon", "p-off"]) {
    assert.equal(await run(CATALOG_PRODUCT_BY_SLUG_QUERY, catalog, { slug }), null, slug);
  }
});

test("R1 product → line: Discontinued line keeps the page but reads Discontinued", async () => {
  const pdp = await run(CATALOG_PRODUCT_BY_SLUG_QUERY, catalog, { slug: "p-gone" });
  assert.notEqual(pdp, null);
  assert.equal(pdp.status, "discontinued");
});

test("R1 product → line: listings admit only open lines; Active (Internal) passes (R4)", async () => {
  const rows = (await run(CATALOG_PRODUCT_LIBRARY_QUERY, catalog)) as { slug: string; status?: string }[];
  const slugs = rows.map((r) => r.slug).sort();
  assert.deepEqual(slugs, ["i-off-line", "p-active", "p-internal", "p-unset"]);
});

test("R1 product → line: inspiration products are not gated by their line", async () => {
  const pdp = await run(CATALOG_PRODUCT_BY_SLUG_QUERY, catalog, { slug: "i-off-line" });
  assert.notEqual(pdp, null);
});

// ─── Customization: option → type → category ───────────────────────────────

const cat = (id: string, status?: string) => ({
  _id: id, _type: "customizationCategory", title: id, slug: { current: id }, ...(status ? { status } : {}),
});
const type = (id: string, catId: string, status?: string) => ({
  _id: id, _type: "customizationType", title: id, slug: { current: id }, category: { _ref: catId },
  ...(status ? { status } : {}),
});
const option = (id: string, typeId: string) => ({
  _id: id, _type: "customizationOption", title: id, slug: { current: id }, status: "active",
  appearsIn: "configurable-with-page", type: { _ref: typeId },
});

const custom = [
  cat("c-on", "active"), cat("c-unset"), cat("c-off", "not-active"),
  type("t-on", "c-on", "active"), type("t-unset", "c-unset"), type("t-off", "c-on", "not-active"),
  type("t-under-off-cat", "c-off", "active"),
  option("o-on", "t-on"), option("o-unset", "t-unset"), option("o-type-off", "t-off"),
  option("o-cat-off", "t-under-off-cat"),
  product("p-config", "l-active", {
    availableCustomizations: ["o-on", "o-type-off", "o-cat-off"].map((id) => ({
      _key: id, customization: { _ref: id },
    })),
  }),
  line("l-active", "active"), style("s"),
];

test("R1 option → type → category: library shows only options under open parents", async () => {
  const rows = (await run(CATALOG_CUSTOMIZATION_LIBRARY_QUERY, custom)) as { _id: string }[];
  assert.deepEqual(rows.map((r) => r._id).sort(), ["o-on", "o-unset"]);
});

test("R1 option → type → category: no detail page under a Not active type or category", async () => {
  assert.equal(await run(CATALOG_CUSTOMIZATION_DETAIL_QUERY, custom, { handle: "o-type-off", category: "c-on" }), null);
  assert.equal(
    await run(CATALOG_CUSTOMIZATION_DETAIL_QUERY, custom, { handle: "o-cat-off", category: "c-off" }),
    null,
  );
  assert.notEqual(await run(CATALOG_CUSTOMIZATION_DETAIL_QUERY, custom, { handle: "o-on", category: "c-on" }), null);
});

test("R1 option → type → category: the configurator and rules drop them too", async () => {
  const rules = (await run(CATALOG_CUSTOMIZATION_RULES_QUERY, custom)) as { options: { _id: string }[] };
  assert.deepEqual(rules.options.map((o) => o._id).sort(), ["o-on", "o-unset"]);
  assert.equal(await run(CATALOG_OPTION_BY_ID_QUERY, custom, { id: "o-type-off" }), null);

  // The PDP projects every listed option; the effective status makes www's existing
  // "drop non-active options" filter catch the ones under a Not active parent.
  const pdp = await run(CATALOG_PRODUCT_BY_SLUG_QUERY, custom, { slug: "p-config" });
  const byId = Object.fromEntries(
    (pdp.availableCustomizations as { customization: { _id: string; status: string } }[]).map(
      (row) => [row.customization._id, row.customization.status],
    ),
  );
  assert.deepEqual(byId, { "o-on": "active", "o-type-off": "not-active", "o-cat-off": "not-active" });
});
