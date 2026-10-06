import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  ALGOLIA_CONTENT_BACKFILL_PROJECTION,
  CONTENT_CUSTOMIZATIONS_FILTER,
  CONTENT_PRODUCTS_FILTER,
  shouldRemoveContentFromAlgolia,
} from "./content-indexes.ts";
import { shouldRemoveContentFromAlgolia as fnShouldRemove } from "../../../../functions/algolia-content-sync/record.ts";

// Admin search finds what customers can reach: products with a page (own status, rule 1,
// R1) and options with a detail page under open parents. Not the retired option `role`.
const dataset = [
  { _id: "line", _type: "productLine", slug: { current: "line" }, status: "active" },
  { _id: "line-off", _type: "productLine", slug: { current: "line-off" }, status: "not-active" },
  { _id: "style", _type: "productStyle", slug: { current: "style" }, productLine: { _ref: "line" } },
  { _id: "style-off", _type: "productStyle", slug: { current: "style-off" }, productLine: { _ref: "line" }, status: "not-active" },
  { _id: "cat", _type: "customizationCategory", slug: { current: "cat" } },
  { _id: "type", _type: "customizationType", category: { _ref: "cat" } },
  { _id: "type-off", _type: "customizationType", category: { _ref: "cat" }, status: "not-active" },
  ...[
    ["p-ok", {}],
    ["p-gone", { status: "discontinued" }],
    ["p-off", { status: "not-active" }],
    ["p-internal", { status: "active-internal" }],
    ["p-styles-off", { productStyle: [{ _ref: "style-off" }] }],
    ["p-line-off", { productLine: { _ref: "line-off" } }],
  ].map(([id, extra]) => ({
    _id: id, _type: "product", kind: "standard", slug: { current: id },
    productLine: { _ref: "line" }, productStyle: [{ _ref: "style" }], ...(extra as object),
  })),
  ...[
    ["o-ok", {}],
    ["o-off", { status: "not-active" }],
    ["o-nopage", { appearsIn: "configurable-no-page" }],
    ["o-type-off", { type: { _ref: "type-off" } }],
  ].map(([id, extra]) => ({
    _id: id, _type: "customizationOption", slug: { current: id }, status: "active",
    appearsIn: "configurable-with-page", type: { _ref: "type" }, ...(extra as object),
  })),
];
const ids = async (filter: string) =>
  ((await (await evaluate(parse(`*[${filter}]._id`), { dataset: dataset as never })).get()) as string[]).sort();

test("product index: only products with a page — own status, parents and line", async () => {
  assert.deepEqual(await ids(CONTENT_PRODUCTS_FILTER), ["p-gone", "p-ok"]);
});

test("customization index: Active options with a detail page under open parents", async () => {
  assert.deepEqual(await ids(CONTENT_CUSTOMIZATIONS_FILTER), ["o-ok"]);
});

test("projection computes indexable, and both copies of the removal rule honour it", async () => {
  const rows = (await (await evaluate(parse(`*[_type in ["product", "customizationOption"]]${ALGOLIA_CONTENT_BACKFILL_PROJECTION}`), { dataset: dataset as never })).get()) as { _id: string; indexable: boolean }[];
  const byId = Object.fromEntries(rows.map((r) => [r._id, r.indexable]));
  assert.deepEqual(byId, {
    "p-ok": true, "p-gone": true, "p-off": false, "p-internal": false, "p-styles-off": false, "p-line-off": false,
    "o-ok": true, "o-off": false, "o-nopage": false, "o-type-off": false,
  });
  for (const remove of [shouldRemoveContentFromAlgolia, fnShouldRemove]) {
    assert.equal(remove({ _id: "x", _type: "product", indexable: false }), true);
    assert.equal(remove({ _id: "x", _type: "product", indexable: true }), false);
    assert.equal(remove({ _id: "x", _type: "customizationOption" }), false, "unset keeps the record");
  }
});
