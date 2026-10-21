import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  SITE_SEARCH_BACKFILL_QUERY,
  SITE_SEARCH_DOC_QUERY,
  SITE_SEARCH_EVENT_FILTER,
  SITE_SEARCH_FILTER,
  SITE_SEARCH_INDEX,
  SITE_SEARCH_MAX_RECORD_BYTES,
  siteSearchRecordProblem,
  type SiteSearchRecord,
} from "./site-search.ts";
import * as fnQuery from "../../../../functions/site-search-sync/query.generated.ts";

// Each type is in the index exactly when its www page exists — the same gates the routes use.
const past = "2026-01-01T00:00:00Z";
const future = "2999-01-01T00:00:00Z";
const dataset = [
  { _id: "line", _type: "productLine", title: "Mailer Boxes", slug: { current: "mailer-boxes" }, status: "active" },
  { _id: "line-off", _type: "productLine", title: "Off line", slug: { current: "line-off" }, status: "not-active" },
  { _id: "line-gone", _type: "productLine", title: "Old line", slug: { current: "line-gone" }, status: "discontinued" },
  { _id: "line-empty", _type: "productLine", title: "Empty line", slug: { current: "line-empty" }, status: "active" },
  { _id: "line-internal", _type: "productLine", title: "Internal line", slug: { current: "line-internal" }, status: "active-internal" },
  { _id: "style", _type: "productStyle", title: "Tuck Mailers", slug: { current: "tuck" }, productLine: { _ref: "line" } },
  { _id: "style-off", _type: "productStyle", title: "Off style", slug: { current: "style-off" }, productLine: { _ref: "line" }, status: "not-active" },
  { _id: "style-in-gone", _type: "productStyle", title: "Style under old line", slug: { current: "s-gone" }, productLine: { _ref: "line-gone" } },
  { _id: "style-in-internal", _type: "productStyle", title: "Style under internal line", slug: { current: "s-int" }, productLine: { _ref: "line-internal" } },
  { _id: "pv-soft", _type: "propertyValue", title: "Soft-touch" },
  ...[
    ["p-ok", {}],
    ["p-gone", { status: "discontinued" }],
    ["p-off", { status: "not-active" }],
    ["p-styles-off", { productStyle: [{ _ref: "style-off" }] }],
    ["p-noindex", { allowIndex: false }],
    ["p-tmp", { sku: "tmp-0042" }],
  ].map(([id, extra]) => ({
    _id: id, _type: "product", kind: "standard", title: `Product ${id}`, slug: { current: id },
    productLine: { _ref: "line" }, productStyle: [{ _ref: "style" }],
    properties: [{ property: { _ref: "finish" }, values: [{ _ref: "pv-soft" }] }],
    images: [{ asset: { _ref: "image-a" } }],
    sku: `SKU-${id}`,
    ...(extra as object),
  })),
  { _id: "drafts.p-ok", _type: "product", kind: "standard", title: "Draft", slug: { current: "p-ok" }, productLine: { _ref: "line" }, productStyle: [{ _ref: "style" }] },
  { _id: "sol", _type: "solution", title: "Cosmetics", slug: { current: "cosmetics" }, status: "active" },
  { _id: "sol-unset", _type: "solution", title: "Never earned a page", slug: { current: "sol-unset" } },
  { _id: "ss", _type: "solutionStyle", title: "Cosmetic Mailers", slug: { current: "mailers" }, status: "active", solution: { _ref: "sol" } },
  { _id: "ss-orphan", _type: "solutionStyle", title: "Under unset solution", slug: { current: "x" }, status: "active", solution: { _ref: "sol-unset" } },
  { _id: "cat", _type: "customizationCategory", title: "Finishing", slug: { current: "finishing" } },
  { _id: "type", _type: "customizationType", title: "Coating", category: { _ref: "cat" } },
  { _id: "o-ok", _type: "customizationOption", title: "Soft-touch Lamination", slug: { current: "soft-touch" }, status: "active", appearsIn: "configurable-with-page", type: { _ref: "type" }, properties: [{ _ref: "pv-soft" }] },
  { _id: "o-nopage", _type: "customizationOption", title: "No page", slug: { current: "o-nopage" }, status: "active", appearsIn: "configurable-no-page", type: { _ref: "type" } },
  { _id: "cs", _type: "caseStudy", title: "Tilt", slug: { current: "tilt" }, publishedAt: past, cardSummary: "Sales doubled." },
  { _id: "cs-scheduled", _type: "caseStudy", title: "Later", slug: { current: "later" }, publishedAt: future },
  { _id: "exp", _type: "expertiseStage", title: "Design", slug: { current: "packaging-design" }, status: "active" },
  { _id: "exp-gone", _type: "expertiseStage", title: "Gone", slug: { current: "gone" }, status: "discontinued" },
  { _id: "pr", _type: "pressRelease", title: "Award", slug: { current: "award" }, publishedAt: past },
  { _id: "post", _type: "post", title: "Kraft vs white", slug: { current: "kraft-vs-white" }, publishedAt: past },
  { _id: "post-unslugged", _type: "post", title: "No slug", publishedAt: past },
];

const run = async (query: string, params: Record<string, unknown> = {}) =>
  (await evaluate(parse(query, { params }), { dataset: dataset as never, params })).get();

test("indexes exactly the documents whose www page exists", async () => {
  const ids = ((await run(`*[${SITE_SEARCH_FILTER}]._id`)) as string[]).sort();
  assert.deepEqual(ids, [
    "cs", "exp", "line", "line-gone", "o-ok", "p-gone", "p-ok", "p-tmp", "post", "pr", "sol", "ss", "style", "style-in-gone",
  ]);
});

test("records carry the www link, group and property-value tags", async () => {
  const rows = (await run(SITE_SEARCH_BACKFILL_QUERY)) as SiteSearchRecord[];
  const byId = Object.fromEntries(rows.map((row) => [row.objectID, row]));
  const pick = (id: string) => {
    const r = byId[id]!;
    return { type: r.type, group: r.group, href: r.href };
  };
  assert.deepEqual(pick("p-ok"), { type: "product", group: "products", href: "/products/p-ok" });
  assert.deepEqual(pick("line"), { type: "product-line", group: "products", href: "/products/mailer-boxes" });
  assert.deepEqual(pick("style"), { type: "product-style", group: "products", href: "/products/mailer-boxes/tuck" });
  assert.deepEqual(pick("ss"), { type: "solution-style", group: "solutions", href: "/solutions/cosmetics/mailers" });
  assert.deepEqual(pick("o-ok"), { type: "customization", group: "customizations", href: "/customizations/finishing/soft-touch" });
  assert.deepEqual(pick("cs"), { type: "case-study", group: "resources", href: "/case-studies/tilt" });
  assert.deepEqual(pick("exp"), { type: "expertise", group: "resources", href: "/expertise/packaging-design" });
  assert.deepEqual(pick("pr"), { type: "press-release", group: "resources", href: "/newsroom/award" });
  assert.deepEqual(pick("post"), { type: "guide", group: "guides", href: "/blog/kraft-vs-white" });

  assert.deepEqual(byId["p-ok"]!.tags, ["Soft-touch"]);
  assert.deepEqual(byId["o-ok"]!.tags, ["Soft-touch"]);
  assert.deepEqual(byId["p-ok"]!.parents, ["Mailer Boxes", "Tuck Mailers"]);
  assert.deepEqual(byId["o-ok"]!.parents, ["Coating", "Finishing"]);
  assert.equal(byId["p-ok"]!.kind, "standard");
  assert.equal(byId["p-ok"]!.typeRank, 1);
  assert.equal(byId["line"]!.kind, null);
  assert.equal(byId["cs"]!.summary, "Sales doubled.");
  assert.equal(byId["exp"]!.summary, "");
  assert.equal(byId["cs"]!.publishedAtTimestamp, Date.parse(past));
  assert.equal(byId["exp"]!.publishedAtTimestamp, 0);
  for (const row of rows) assert.equal(siteSearchRecordProblem(row), null, row.objectID);
});

test("products carry their SKU; temporary TMP- codes and other types carry none", async () => {
  const rows = (await run(SITE_SEARCH_BACKFILL_QUERY)) as SiteSearchRecord[];
  const sku = Object.fromEntries(rows.map((row) => [row.objectID, row.sku]));
  assert.equal(sku["p-ok"], "SKU-p-ok");
  assert.equal(sku["p-tmp"], null);
  assert.equal(sku["line"], null);
  assert.equal(sku["post"], null);
});

test("the Function's query returns null for a document that stopped qualifying", async () => {
  assert.equal(((await run(SITE_SEARCH_DOC_QUERY, { id: "p-ok" })) as SiteSearchRecord).objectID, "p-ok");
  for (const id of ["p-off", "p-noindex", "drafts.p-ok", "cs-scheduled", "o-nopage"]) {
    assert.equal(await run(SITE_SEARCH_DOC_QUERY, { id }), null, id);
  }
});

test("the event filter still fires for hidden documents, so they can be removed", async () => {
  const ids = (await run(`*[${SITE_SEARCH_EVENT_FILTER}]._id`)) as string[];
  for (const id of ["p-off", "p-noindex", "exp-gone", "post-unslugged"]) assert.ok(ids.includes(id), id);
});

test("a row that cannot make a working result is reported, not saved", () => {
  const ok = { objectID: "a", type: "guide", title: "x", href: "/blog/x" } as const;
  assert.equal(siteSearchRecordProblem(ok), null);
  assert.equal(siteSearchRecordProblem({ ...ok, href: undefined }), "no link");
  assert.equal(siteSearchRecordProblem({ ...ok, title: "  " }), "no title");
  assert.match(siteSearchRecordProblem({ ...ok, summary: "x".repeat(10_000) })!, /bytes$/);
});

test("the Function bundle's copy of the query is current (pnpm --filter @pakfactory/sanity run gen:site-search-fn)", () => {
  assert.equal(fnQuery.SITE_SEARCH_DOC_QUERY, SITE_SEARCH_DOC_QUERY);
  assert.equal(fnQuery.SITE_SEARCH_INDEX, SITE_SEARCH_INDEX);
  assert.equal(fnQuery.SITE_SEARCH_MAX_RECORD_BYTES, SITE_SEARCH_MAX_RECORD_BYTES);
});
