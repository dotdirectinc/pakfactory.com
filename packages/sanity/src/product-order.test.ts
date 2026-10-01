import assert from "node:assert/strict";
import { test } from "node:test";
import { orderProductsInStyle } from "./product-order.ts";

/**
 * Pinned products at the top of a Product Style (PROD-2747).
 *
 * `productStyle.productOrder` is ORDER ONLY and never a gate: a product it does
 * not name still appears, alphabetically, after the ones it does. A partial list
 * is the normal state.
 *
 * 🔴 The state of all 98 styles on merge is `productOrder` unset. If the first
 * two tests ever stop being plain alphabetical, the field has changed behaviour
 * before anyone pinned anything.
 */

const p = (id: string, title: string) => ({ _id: id, title });
const ref = (id: string) => ({ _type: "reference", _ref: id });

/** Deliberately NOT alphabetical — the tail must sort, not pass through. */
const PRODUCTS = [p("c", "Gift Bags"), p("a", "Box Inserts"), p("b", "Labels")];
const titles = (rows: { title?: string | null }[]) => rows.map((r) => r.title);

test("no productOrder: plain alphabetical", () => {
  assert.deepEqual(titles(orderProductsInStyle(PRODUCTS, undefined)), [
    "Box Inserts", "Gift Bags", "Labels",
  ]);
  assert.deepEqual(titles(orderProductsInStyle(PRODUCTS, null)), [
    "Box Inserts", "Gift Bags", "Labels",
  ]);
});

test("productOrder set but empty: same as unset", () => {
  assert.deepEqual(titles(orderProductsInStyle(PRODUCTS, [])), [
    "Box Inserts", "Gift Bags", "Labels",
  ]);
});

test("partial productOrder: pinned leads, the rest alphabetically", () => {
  assert.deepEqual(titles(orderProductsInStyle(PRODUCTS, [ref("c")])), [
    "Gift Bags", "Box Inserts", "Labels",
  ]);
});

test("full productOrder: exactly the drag order", () => {
  assert.deepEqual(
    titles(orderProductsInStyle(PRODUCTS, [ref("c"), ref("b"), ref("a")])),
    ["Gift Bags", "Labels", "Box Inserts"],
  );
});

// The references are WEAK, so deleting a pinned product succeeds and leaves the
// entry behind. It must not reach the page.
test("a dangling reference to a deleted product is dropped", () => {
  assert.deepEqual(
    titles(orderProductsInStyle(PRODUCTS, [ref("c"), ref("DELETED"), ref("a")])),
    ["Gift Bags", "Box Inserts", "Labels"],
  );
});

test("a productOrder naming only deleted products still returns the full list", () => {
  assert.deepEqual(titles(orderProductsInStyle(PRODUCTS, [ref("GONE")])), [
    "Box Inserts", "Gift Bags", "Labels",
  ]);
});

// A pinned product whose primary style is elsewhere is never passed in by the
// caller, so it behaves exactly like a dangling ref rather than appearing.
test("a pinned product the caller did not pass is dropped, not invented", () => {
  assert.deepEqual(
    titles(orderProductsInStyle([p("a", "Box Inserts")], [ref("elsewhere"), ref("a")])),
    ["Box Inserts"],
  );
});

test("an empty style returns an empty list, not a throw", () => {
  assert.deepEqual(orderProductsInStyle([], [ref("GONE")]), []);
});

test("a repeated ref pins once and does not duplicate the product", () => {
  assert.deepEqual(
    titles(orderProductsInStyle(PRODUCTS, [ref("c"), ref("c")])),
    ["Gift Bags", "Box Inserts", "Labels"],
  );
});

test("plain string refs are accepted alongside reference objects", () => {
  assert.deepEqual(titles(orderProductsInStyle(PRODUCTS, ["b", ref("c")])), [
    "Labels", "Gift Bags", "Box Inserts",
  ]);
});

test("a product with no title sorts by _id rather than throwing", () => {
  const rows = orderProductsInStyle([p("z", "Alpha"), { _id: "m" }], undefined);
  assert.deepEqual(rows.map((r) => r._id), ["z", "m"]);
});

test("the input array is not mutated", () => {
  const input = [...PRODUCTS];
  orderProductsInStyle(input, [ref("b")]);
  assert.deepEqual(titles(input), ["Gift Bags", "Box Inserts", "Labels"]);
});
