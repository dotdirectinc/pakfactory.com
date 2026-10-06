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
  line("internal", { status: "active-internal" }),
  style("s-active", "active", { status: "active" }),
  style("s-unset", "active"),
  style("s-coming", "active", { status: "coming-soon" }),
  style("s-gone", "active", { status: "discontinued" }),
  style("s-internal", "active", { status: "active-internal" }),
  { _id: "opt", _type: "customizationOption", title: "Opt", status: "active", appearsIn: "configurable-with-page", slug: { current: "opt" } },
  // PROD-2732 fail-closed: `appearsIn` unset (an un-backfilled import, an API write)
  // must keep the option OUT of the library. HAS_DETAIL_PAGE names the two values it
  // wants; a `!= "configurable-no-page"` test would let this one through.
  { _id: "opt-unset", _type: "customizationOption", title: "Unset", status: "active", slug: { current: "opt-unset" } },
  // PROD-2733: Not active hides an option everywhere a customer could meet it. The
  // query tests `status == "active"`, so this held under the old three-value list too.
  { _id: "opt-off", _type: "customizationOption", title: "Off", status: "not-active", appearsIn: "configurable-with-page", slug: { current: "opt-off" } },
  product("p-active", "active", "s-active"),
  product("p-coming-line", "coming", "s-active"),
  product("p-bad-style", "active", "s-coming"),
  product("p-gone", "gone", "s-active"),
  product("p-internal", "internal", "s-active"),
  // PROD-2843 — primary + secondary; membership is the full listed set.
  product("p-multi", "active", "s-active", {
    productStyle: [{_ref: "s-active"}, {_ref: "s-internal"}],
  }),
];

async function run(query: string, params: Record<string, unknown> = {}) {
  return (await evaluate(parse(query), { dataset, params })).get();
}

// LISTED, not "visible": active-internal IS listed — it answers as a catalog filter,
// which is how a specialty line keeps its products reachable while having no page (R4).
test("lines list: coming-soon and discontinued are left out; unset and active-internal stay", async () => {
  const slugs = ((await run(CATALOG_PRODUCT_LINES_QUERY)) as { slug: string }[]).map((l) => l.slug).sort();
  assert.deepEqual(slugs, ["active", "internal", "unset"]);
});

// 🔴 The route gate is HAS_PAGE, which is NOT the listing gate, and the two disagree in
// both directions. A discontinued line keeps its page on purpose — the URL stays
// indexable after the line leaves the listings — while active-internal is listed but
// has no page at all. Gating the route on the listing would 404 a page that should rank.
test("line route: discontinued still resolves; coming-soon and active-internal 404", async () => {
  assert.ok(await run(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, { slug: "gone" }));
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "gone" }), "gone");
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "internal" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "coming" }), null);
  assert.equal(await run(CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY, { slug: "active" }), "active");
});

test("a line's styles grid: coming-soon and discontinued are left out; active-internal stays", async () => {
  const doc = (await run(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY, { slug: "active" })) as { styles: { slug: string }[] };
  assert.deepEqual(doc.styles.map((s) => s.slug).sort(), ["s-active", "s-internal", "s-unset"]);
});

// The facet renders LINKS, so it needs LINE_STYLE_ACTIVE — listed *and* page-bearing.
// active-internal is listed but has nowhere to send anyone.
test("option → product lines facet never offers a line a customer cannot open", async () => {
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

test("case-studies Products filter offers every listed line", async () => {
  const { CASE_STUDY_FILTER_OPTIONS_QUERY } = await import("./case-studies.ts");
  const result = (await run(CASE_STUDY_FILTER_OPTIONS_QUERY)) as { products: { value?: string; slug?: string; title?: string }[] };
  const titles = result.products.map((p) => p.title ?? p.value ?? p.slug).sort();
  assert.deepEqual(titles, ["active", "internal", "unset"]);
});

// 🔴 The orphan guard. `mapSanityProduct` returns null when the style ref is null, so a
// parent that fails this projection takes its products off the site with it. That is
// exactly why the gate here is LISTED and not HAS_PAGE: an active-internal parent must
// still resolve (R4), or hiding a line would silently delist every product under it.
test("product library: a restricted parent nulls out, but an active-internal one does not", async () => {
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
  // R4 — the whole point of the value: the line is hidden, its products are not.
  assert.equal(bySlug["p-internal"]?.productLine?.slug, "internal");

  assert.equal(bySlug["p-bad-style"]?.productLine?.slug, "active");
  assert.equal(bySlug["p-bad-style"]?.productStyle, null);
});

test("product library: productStyles is the listed union; primary stays productStyle (PROD-2843)", async () => {
  const rows = (await run(CATALOG_PRODUCT_LIBRARY_QUERY)) as {
    slug: string;
    productStyle: {slug: string} | null;
    productStyles: {slug: string}[] | null;
  }[];
  const multi = rows.find((row) => row.slug === "p-multi");
  assert.ok(multi, "multi-style fixture missing from library query");
  assert.equal(multi.productStyle?.slug, "s-active");
  assert.deepEqual(
    (multi.productStyles ?? []).map((s) => s.slug).sort(),
    ["s-active", "s-internal"],
  );

  const primaryOnly = rows.find((row) => row.slug === "p-active");
  assert.deepEqual(
    (primaryOnly?.productStyles ?? []).map((s) => s.slug),
    ["s-active"],
  );

  // Coming-soon primary is not listed — productStyles stays empty (no secondaries).
  const bad = rows.find((row) => row.slug === "p-bad-style");
  assert.equal(bad?.productStyle, null);
  assert.deepEqual(bad?.productStyles ?? [], []);
});
