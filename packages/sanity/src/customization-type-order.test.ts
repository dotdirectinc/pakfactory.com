import assert from "node:assert/strict";
import { test } from "node:test";
import { orderTypesInCategory } from "./customization-type-order.ts";

/**
 * Mirrors line-style-order.test.ts, which covers the GROQ twin for
 * `productLine.styleOrder`. Same contract, so the two should read alike.
 */

const T = (id: string, title: string) => ({ _id: id, title });

/** Deliberately NOT supplied in alphabetical order — the tail must sort, not pass through. */
const TYPES = [T("c", "Paperboard"), T("a", "Corrugated"), T("b", "Kraft Paper")];

const titles = (
  typeOrder?: Parameters<typeof orderTypesInCategory>[1],
  types: readonly { _id: string; title: string }[] = TYPES,
) => orderTypesInCategory(types, typeOrder).map((t) => t.title);

// 🔴 The state of every category on merge: 0 of 4 carry the key. If this ever
// stops being plain alphabetical, the field has started changing behaviour before
// anyone dragged anything.
test("no typeOrder: plain alphabetical", () => {
  assert.deepEqual(titles(undefined), ["Corrugated", "Kraft Paper", "Paperboard"]);
  assert.deepEqual(titles(null), ["Corrugated", "Kraft Paper", "Paperboard"]);
  assert.deepEqual(titles([]), ["Corrugated", "Kraft Paper", "Paperboard"]);
});

test("partial typeOrder: listed types lead, in drag order; the rest follow alphabetically", () => {
  assert.deepEqual(titles([{ _ref: "c" }]), ["Paperboard", "Corrugated", "Kraft Paper"]);
});

test("full typeOrder: exactly the drag order", () => {
  assert.deepEqual(titles([{ _ref: "c" }, { _ref: "a" }, { _ref: "b" }]), [
    "Paperboard",
    "Corrugated",
    "Kraft Paper",
  ]);
});

// `typeOrder` holds WEAK references — that is the trade for not making a listed
// type undeletable. A deleted type leaves the entry behind; it must not surface.
test("a dangling reference to a deleted type is dropped", () => {
  assert.deepEqual(titles([{ _ref: "c" }, { _ref: "DELETED" }, { _ref: "a" }]), [
    "Paperboard",
    "Corrugated",
    "Kraft Paper",
  ]);
});

test("a typeOrder naming only deleted types still returns the full list", () => {
  assert.deepEqual(titles([{ _ref: "GONE" }]), ["Corrugated", "Kraft Paper", "Paperboard"]);
});

// A ref can point at a type that exists but sits in another category — the picker
// prevents it, but a category reassignment after the fact does not clean it up.
test("a reference to a type outside this category is dropped", () => {
  assert.deepEqual(titles([{ _ref: "elsewhere" }, { _ref: "a" }]), [
    "Corrugated",
    "Kraft Paper",
    "Paperboard",
  ]);
});

test("a repeated reference is listed once, at its first position", () => {
  assert.deepEqual(titles([{ _ref: "c" }, { _ref: "a" }, { _ref: "c" }]), [
    "Paperboard",
    "Corrugated",
    "Kraft Paper",
  ]);
});

test("plain string refs are accepted, so either GROQ projection shape works", () => {
  assert.deepEqual(titles(["c", "a"]), ["Paperboard", "Corrugated", "Kraft Paper"]);
});

test("a type with no title falls back to its id rather than sorting as empty", () => {
  const types = [{ _id: "zzz", title: null }, T("a", "Corrugated")];
  assert.deepEqual(orderTypesInCategory(types, []).map((t) => t._id), ["a", "zzz"]);
});

test("no types at all returns an empty list, not a throw", () => {
  assert.deepEqual(orderTypesInCategory([], [{ _ref: "c" }]), []);
});

test("the input array is not mutated", () => {
  const input = [...TYPES];
  orderTypesInCategory(input, [{ _ref: "a" }]);
  assert.deepEqual(input.map((t) => t._id), ["c", "a", "b"]);
});
