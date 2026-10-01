import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import { CATALOG_PRODUCT_LINE_BY_SLUG_QUERY } from "./catalog.ts";

/**
 * The merchandised styles grid (PROD-2739).
 *
 * `productLine.styleOrder` sets the order of a line's styles grid. It is ORDER
 * ONLY and never a gate: styles it does not name still render, alphabetically,
 * after the ones it does. A partial list is therefore the normal state, not a
 * half-finished one — which is why every case below asserts the whole grid, not
 * just the pinned head.
 *
 * This file exists because the field this replaces (`productLine.styles`,
 * removed in PROD-2509) advertised exactly this fallback in its description and
 * nobody ever wrote it. The behaviour is only real if it is tested.
 */

const line = (extra: Record<string, unknown> = {}) => ({
  _id: "L", _type: "productLine", title: "Line", slug: { current: "line" }, ...extra,
});
const style = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  _id: id, _type: "productStyle", title, slug: { current: id }, productLine: { _ref: "L" }, ...extra,
});
const ref = (id: string, key: string) => ({ _type: "reference", _ref: id, _key: key });

/** Alpha / Beta / Gamma, deliberately NOT in alphabetical _id order. */
const STYLES = [style("c", "Gamma"), style("a", "Alpha"), style("b", "Beta")];

async function gridFor(dataset: unknown[]): Promise<string[]> {
  const doc = (await (
    await evaluate(parse(CATALOG_PRODUCT_LINE_BY_SLUG_QUERY), {
      dataset: dataset as never,
      params: { slug: "line" },
    })
  ).get()) as { styles: { title: string }[] } | null;
  assert.ok(doc, "fixture line did not resolve");
  return doc.styles.map((s) => s.title);
}

// 🔴 The regression that matters on merge. `styleOrder` is unset on all 15 lines
// until someone drags something, so this is the state of production the day this
// ships. In GROQ `null + array` is null and `_id in null[]._ref` matches nothing,
// so dropping either coalesce in LINE_STYLES empties every grid on the site with
// no error anywhere. Both failures were observed before the coalesces went in.
test("no styleOrder: the grid is alphabetical, exactly as before the field existed", async () => {
  assert.deepEqual(await gridFor([line(), ...STYLES]), ["Alpha", "Beta", "Gamma"]);
});

test("styleOrder set but empty: same as unset", async () => {
  assert.deepEqual(await gridFor([line({ styleOrder: [] }), ...STYLES]), ["Alpha", "Beta", "Gamma"]);
});

test("partial styleOrder: listed styles lead, in drag order; the rest follow alphabetically", async () => {
  const dataset = [line({ styleOrder: [ref("c", "k1"), ref("a", "k2")] }), ...STYLES];
  assert.deepEqual(await gridFor(dataset), ["Gamma", "Alpha", "Beta"]);
});

test("full styleOrder: the grid is exactly the drag order", async () => {
  const dataset = [line({ styleOrder: [ref("c", "k1"), ref("b", "k2"), ref("a", "k3")] }), ...STYLES];
  assert.deepEqual(await gridFor(dataset), ["Gamma", "Beta", "Alpha"]);
});

// `styleOrder` holds WEAK references, so deleting a listed style succeeds and
// leaves a dangling entry behind — that is the trade for not making a style
// undeletable, which is what got the previous field removed. The entry must not
// reach the site: it dereferences to null, and `defined(_id)` drops it.
test("a deleted style leaves a dangling reference that never reaches the site", async () => {
  const dataset = [line({ styleOrder: [ref("c", "k1"), ref("DELETED", "k2"), ref("a", "k3")] }), ...STYLES];
  assert.deepEqual(await gridFor(dataset), ["Gamma", "Alpha", "Beta"]);
});

// Both tiers must agree on visibility. A style pinned to position one and then
// discontinued would otherwise reappear on the grid it was pulled from.
test("a listed style that is no longer visible is dropped, not pinned", async () => {
  const dataset = [
    line({ styleOrder: [ref("d", "k1"), ref("a", "k2")] }),
    ...STYLES,
    style("d", "Delta", { status: "discontinued" }),
  ];
  assert.deepEqual(await gridFor(dataset), ["Alpha", "Beta", "Gamma"]);
});

test("a line whose styleOrder names only deleted styles still renders its grid", async () => {
  const dataset = [line({ styleOrder: [ref("DELETED", "k1")] }), ...STYLES];
  assert.deepEqual(await gridFor(dataset), ["Alpha", "Beta", "Gamma"]);
});

test("a line with no styles at all returns an empty grid, not null", async () => {
  assert.deepEqual(await gridFor([line({ styleOrder: [ref("DELETED", "k1")] })]), []);
});
