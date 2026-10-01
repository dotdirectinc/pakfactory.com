import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  CATALOG_CUSTOMIZATION_LIBRARY_QUERY,
  CATALOG_PRODUCT_LIBRARY_QUERY,
  CATALOG_PRODUCT_LINE_BY_SLUG_QUERY,
  CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY,
  CATALOG_PRODUCT_LINES_QUERY,
} from "./catalog.ts";

// Lines/styles: discontinued and coming-soon are hidden (no page / route / listing).
// Products still list coming-soon via LISTED_STATUS. Unset status stays active.
const line = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id, _type: "productLine", title: id, slug: { current: id }, ...extra,
});
const style = (id: string, lineId: string, extra: Record<string, unknown> = {}) => ({
  _id: id, _type: "productStyle", title: id, slug: { current: id }, productLine: { _ref: lineId }, ...extra,
});
const product = (
  id: string,
  lineId: string,
  styleId: string,
  extra: Record<string, unknown> = {},
) => ({
  _id: id,
  _type: "product",
  title: id,
  slug: { current: id },
  productLine: { _ref: lineId },
  productStyle: [{ _ref: styleId }],
  availableCustomizations: [{ customization: { _ref: "opt" } }],
  ...extra,
});
const dataset = [
  line("active", { status: "active" }),
  line("unset"),
  line("coming", { status: "coming-soon" }),
  line("gone", { status: "discontinued" }),
  line("hidden", { customerFacing: false }),
  style("s-active", "active", { status: "active" }),
  style("s-unset", "active"),
  style("s-coming", "active", { status: "coming-soon" }),
  style("s-gone", "active", { status: "discontinued" }),
  style("s-hidden", "active", { customerFacing: false }),
  { _id: "opt", _type: "customizationOption", title: "Opt", status: "active", appearsIn: "configurable-with-page", slug: { current: "opt" } },
  // PROD-2732 fail-closed: `appearsIn` unset (an un-backfilled import, an API write)
  // must keep the option OUT of the library. HAS_DETAIL_PAGE names the two values it
  // wants; a `!= "configurable-no-page"` test would let this one through.
  { _id: "opt-unset", _type: "customizationOption", title: "Unset", status: "active", slug: { current: "opt-unset" } },
  // Not active hides an option everywhere a customer could meet it. `discontinued`
  // is the deployed spelling today; PROD-2733 would rename it, and this stays true
  // either way because the query tests `status == "active"`.
  { _id: "opt-off", _type: "customizationOption", title: "Off", status: "discontinued", appearsIn: "configurable-with-page", slug: { current: "opt-off" } },
  product("p-active", "active", "s-active"),
  product("p-coming-line", "coming", "s-active"),
  product("p-bad-style", "active", "s-coming"),
  product("p-gone", "gone", "s-active"),
  product("p-hidden", "hidden", "s-active"),
];

async function run(query: string, params: Record<string, unknown> = {}) {
  return (await evaluate(parse(query), { dataset, params })).get();
}

test("lines list: coming-soon, discontinued, and hidden lines are left out; unset stays", async () => {
  const slugs = ((await run(CATALOG_PRODUCT_LINES_QUERY)) as { slug: string }[]).map((l) => l.slug).sort();
  assert.deepEqual(slugs, ["active", "unset"]);
});

test("line page and route probe: coming-soon and discontinued lines resolve to nothing (404)", async () => {
  assert.equal(await run(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, { slug: "gone" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "gone" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "hidden" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "coming" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "active" }), "active");
});

test("a line's styles (the style route gate): coming-soon, discontinued, and hidden styles are left out", async () => {
  const doc = (await run(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, { slug: "active" })) as { styles: { slug: string }[] };
  assert.deepEqual(doc.styles.map((s) => s.slug).sort(), ["s-active", "s-unset"]);
});

test("option → product lines facet never offers a discontinued, coming-soon, or hidden line", async () => {
  const rows = (await run(CATALOG_CUSTOMIZATION_LIBRARY_QUERY)) as { _id: string; productLines?: ({ slug: string } | null)[] }[];
  const opt = rows.find((r) => r._id === "opt");
  assert.ok(opt, "fixture option not returned by the library query");
  const slugs = [...new Set((opt.productLines ?? []).filter(Boolean).map((l) => l!.slug))];
  assert.deepEqual(slugs, ["active"]);
});

test("customization library: an option with no appearsIn, or one that is not active, is left out", async () => {
  const rows = (await run(CATALOG_CUSTOMIZATION_LIBRARY_QUERY)) as { _id: string }[];
  const ids = rows.map((r) => r._id).sort();
  assert.deepEqual(ids, ["opt"], "only the active, page-bearing option is listed");
});

test("case-studies Products filter offers only lines that have a page", async () => {
  const { CASE_STUDY_FILTER_OPTIONS_QUERY } = await import("./case-studies.ts");
  const result = (await run(CASE_STUDY_FILTER_OPTIONS_QUERY)) as { products: { value?: string; slug?: string; title?: string }[] };
  const titles = result.products.map((p) => p.title ?? p.value ?? p.slug).sort();
  assert.deepEqual(titles, ["active", "unset"]);
});

test("product library: line/style projections null out when LINE_STYLE_VISIBLE fails", async () => {
  const rows = (await run(CATALOG_PRODUCT_LIBRARY_QUERY)) as {
    slug: string;
    productLine: { slug: string } | null;
    productStyle: { slug: string } | null;
  }[];
  const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));

  assert.equal(bySlug["p-active"]?.productLine?.slug, "active");
  assert.equal(bySlug["p-active"]?.productStyle?.slug, "s-active");

  assert.equal(bySlug["p-coming-line"]?.productLine, null);
  assert.equal(bySlug["p-gone"]?.productLine, null);
  assert.equal(bySlug["p-hidden"]?.productLine, null);

  assert.equal(bySlug["p-bad-style"]?.productLine?.slug, "active");
  assert.equal(bySlug["p-bad-style"]?.productStyle, null);
});
