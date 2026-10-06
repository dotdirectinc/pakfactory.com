import assert from "node:assert/strict";
import { test } from "node:test";
import { orderOptionsInType } from "./option-order.ts";

/**
 * Pinned options at the top of a Customization Type (PROD-2748).
 *
 * ORDER ONLY and never a gate: an option `optionOrder` does not name still appears,
 * alphabetically, after the ones it does.
 *
 * 🔴 The state of all 34 types on merge is `optionOrder` unset. If the first two
 * tests stop being plain alphabetical, the field has changed behaviour before
 * anyone pinned anything.
 */

const o = (id: string, title: string) => ({ _id: id, title });
const ref = (id: string) => ({ _type: "reference", _ref: id });

/** Deliberately NOT alphabetical — the tail must sort, not pass through. */
const OPTIONS = [o("c", "Soft Touch"), o("a", "Gloss"), o("b", "Matte")];
const titles = (rows: { title?: string | null }[]) => rows.map((r) => r.title);

test("no optionOrder: plain alphabetical", () => {
  assert.deepEqual(titles(orderOptionsInType(OPTIONS, undefined)), ["Gloss", "Matte", "Soft Touch"]);
  assert.deepEqual(titles(orderOptionsInType(OPTIONS, null)), ["Gloss", "Matte", "Soft Touch"]);
});

test("optionOrder set but empty: same as unset", () => {
  assert.deepEqual(titles(orderOptionsInType(OPTIONS, [])), ["Gloss", "Matte", "Soft Touch"]);
});

test("partial optionOrder: pinned leads, the rest alphabetically", () => {
  assert.deepEqual(titles(orderOptionsInType(OPTIONS, [ref("c")])), ["Soft Touch", "Gloss", "Matte"]);
});

test("full optionOrder: exactly the drag order", () => {
  assert.deepEqual(
    titles(orderOptionsInType(OPTIONS, [ref("c"), ref("b"), ref("a")])),
    ["Soft Touch", "Matte", "Gloss"],
  );
});

// References are WEAK, so deleting a pinned option succeeds and leaves the entry.
test("a dangling reference to a deleted option is dropped", () => {
  assert.deepEqual(
    titles(orderOptionsInType(OPTIONS, [ref("c"), ref("DELETED"), ref("a")])),
    ["Soft Touch", "Gloss", "Matte"],
  );
});

test("an optionOrder naming only deleted options still returns the full list", () => {
  assert.deepEqual(titles(orderOptionsInType(OPTIONS, [ref("GONE")])), ["Gloss", "Matte", "Soft Touch"]);
});

test("an option the caller did not pass is dropped, not invented", () => {
  assert.deepEqual(
    titles(orderOptionsInType([o("a", "Gloss")], [ref("elsewhere"), ref("a")])),
    ["Gloss"],
  );
});

test("a type with no options returns an empty list, not a throw", () => {
  assert.deepEqual(orderOptionsInType([], [ref("GONE")]), []);
});

test("a repeated ref pins once and does not duplicate the option", () => {
  assert.deepEqual(titles(orderOptionsInType(OPTIONS, [ref("c"), ref("c")])), [
    "Soft Touch", "Gloss", "Matte",
  ]);
});

test("plain string refs are accepted alongside reference objects", () => {
  assert.deepEqual(titles(orderOptionsInType(OPTIONS, ["b", ref("c")])), [
    "Matte", "Soft Touch", "Gloss",
  ]);
});

test("an option with no title sorts by _id rather than throwing", () => {
  const rows = orderOptionsInType([o("z", "Alpha"), { _id: "m" }], undefined);
  assert.deepEqual(rows.map((r) => r._id), ["z", "m"]);
});

test("the input array is not mutated", () => {
  const input = [...OPTIONS];
  orderOptionsInType(input, [ref("b")]);
  assert.deepEqual(titles(input), ["Soft Touch", "Gloss", "Matte"]);
});
