import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  CATALOG_CUSTOMIZATION_LIBRARY_QUERY,
  CATALOG_PRODUCT_LINE_BY_SLUG_QUERY,
  CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY,
  CATALOG_PRODUCT_LINES_QUERY,
} from "./catalog.ts";

// PROD-2620 (Richard, 2026-09-29): a discontinued product line or style is hidden — no page,
// no route, no listing — exactly like `customerFacing: false`. `coming-soon` and an unset
// status stay visible.
const line = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id, _type: "productLine", title: id, slug: { current: id }, ...extra,
});
const style = (id: string, lineId: string, extra: Record<string, unknown> = {}) => ({
  _id: id, _type: "productStyle", title: id, slug: { current: id }, productLine: { _ref: lineId }, ...extra,
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
  { _id: "opt", _type: "customizationOption", title: "Opt", hasPage: true, slug: { current: "opt" } },
  ...["active", "gone", "hidden"].map((l) => ({
    _id: `p-${l}`, _type: "product", title: `p-${l}`, slug: { current: `p-${l}` },
    productLine: { _ref: l }, availableCustomizations: [{ customization: { _ref: "opt" } }],
  })),
];

async function run(query: string, params: Record<string, unknown> = {}) {
  return (await evaluate(parse(query), { dataset, params })).get();
}

test("lines list: discontinued and hidden lines are left out; coming-soon and unset stay", async () => {
  const slugs = ((await run(CATALOG_PRODUCT_LINES_QUERY)) as { slug: string }[]).map((l) => l.slug).sort();
  assert.deepEqual(slugs, ["active", "coming", "unset"]);
});

test("line page and route probe: a discontinued line resolves to nothing (404)", async () => {
  assert.equal(await run(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, { slug: "gone" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "gone" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "hidden" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "coming" }), "coming");
});

test("a line's styles (the style route gate): discontinued and hidden styles are left out", async () => {
  const doc = (await run(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, { slug: "active" })) as { styles: { slug: string }[] };
  assert.deepEqual(doc.styles.map((s) => s.slug).sort(), ["s-active", "s-coming", "s-unset"]);
});

test("option → product lines facet never offers a discontinued or hidden line", async () => {
  const rows = (await run(CATALOG_CUSTOMIZATION_LIBRARY_QUERY)) as { _id: string; productLines?: ({ slug: string } | null)[] }[];
  const opt = rows.find((r) => r._id === "opt");
  assert.ok(opt, "fixture option not returned by the library query");
  const slugs = (opt.productLines ?? []).filter(Boolean).map((l) => l!.slug);
  assert.deepEqual(slugs, ["active"]);
});

test("case-studies Products filter offers only lines that have a page", async () => {
  const { CASE_STUDY_FILTER_OPTIONS_QUERY } = await import("./case-studies.ts");
  const result = (await run(CASE_STUDY_FILTER_OPTIONS_QUERY)) as { products: { value?: string; slug?: string; title?: string }[] };
  const titles = result.products.map((p) => p.title ?? p.value ?? p.slug).sort();
  assert.deepEqual(titles, ["active", "coming", "unset"]);
});
