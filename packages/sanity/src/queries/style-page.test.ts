import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import { CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, CATALOG_PRODUCT_STYLE_PAGE_QUERY } from "./catalog.ts";

// A Product Style has a page only while Active or Discontinued (the visibility sheet).
// Coming soon, Not active and Active (Internal) have none, so nothing may link to one.
const style = (id: string, status?: string) => ({
  _id: id, _type: "productStyle", title: id, slug: { current: id },
  productLine: { _ref: "line" }, ...(status ? { status } : {}),
});
const dataset = [
  { _id: "line", _type: "productLine", title: "Line", slug: { current: "line" }, status: "active" },
  style("s-active", "active"), style("s-unset"), style("s-internal", "active-internal"),
  style("s-gone", "discontinued"), style("s-soon", "coming-soon"), style("s-off", "not-active"),
];
async function run(query: string, params: Record<string, unknown>) {
  return (await (await evaluate(parse(query), { dataset: dataset as never, params })).get()) as any;
}

test("line styles carry hasPage; the grid still lists Active (Internal) — www drops it before linking", async () => {
  const line = await run(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, { slug: "line" });
  const bySlug = Object.fromEntries(line.styles.map((s: any) => [s.slug, s.hasPage]));
  assert.deepEqual(bySlug, { "s-active": true, "s-internal": false, "s-unset": true });
});

test("style page lookup: Active and Discontinued only", async () => {
  for (const [slug, expected] of [
    ["s-active", true], ["s-unset", true], ["s-gone", true],
    ["s-internal", false], ["s-soon", false], ["s-off", false],
  ] as const) {
    const doc = await run(CATALOG_PRODUCT_STYLE_PAGE_QUERY, { lineSlug: "line", styleSlug: slug });
    assert.equal(doc != null, expected, slug);
  }
});
