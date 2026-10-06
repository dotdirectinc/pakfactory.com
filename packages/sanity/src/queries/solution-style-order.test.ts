import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  SOLUTION_BY_SLUG_QUERY,
  SOLUTION_STYLE_BY_SLUGS_QUERY,
  SOLUTION_STYLE_PAGE_PARAMS_QUERY,
  SOLUTION_STYLES_FOR_SOLUTION_QUERY,
} from "./solutions.ts";

/**
 * The merchandised solution-style bands (PROD-2742).
 *
 * `solution.styleOrder` sets the order of a solution's styles. It is ORDER ONLY
 * and never a gate: a style it does not name still renders, alphabetically, after
 * the ones it does. A partial list is the normal state.
 *
 * TWO queries carry it and both are covered here, because they read `styleOrder`
 * differently — the landing page has the solution in scope as `^`, the collection
 * band only has a slug and reads it off the parent document it now roots on.
 */

const solution = (extra: Record<string, unknown> = {}) => ({
  _id: "S",
  _type: "solution",
  title: "Beauty & Cosmetics",
  slug: { current: "beauty" },
  status: "active",
  solutionType: "industry",
  ...extra,
});
const style = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  _type: "solutionStyle",
  status: "active",
  title,
  slug: { current: id },
  solution: { _ref: "S" },
  ...extra,
});
const ref = (id: string, key: string) => ({ _type: "reference", _ref: id, _key: key });

/** Deliberately NOT in alphabetical order — the tail must sort, not pass through. */
const STYLES = [style("c", "Gift Bags"), style("a", "Box Inserts"), style("b", "Labels")];

async function run(query: string, dataset: unknown[], params: Record<string, unknown>) {
  return (await (
    await evaluate(parse(query), { dataset: dataset as never, params })
  ).get()) as unknown;
}

/** The collection band — roots on the solution, returns the style array. */
async function band(dataset: unknown[]): Promise<string[]> {
  const rows = (await run(SOLUTION_STYLES_FOR_SOLUTION_QUERY, dataset, {
    solutionSlug: "beauty",
  })) as { title: string }[] | null;
  return (rows ?? []).map((s) => s.title);
}

/** The landing page — reads `styleOrder` through `^`. */
async function landing(dataset: unknown[]): Promise<string[]> {
  const doc = (await run(SOLUTION_BY_SLUG_QUERY, dataset, { slug: "beauty" })) as {
    relatedSolutionStyles?: { title?: string }[] | null;
  } | null;
  return (doc?.relatedSolutionStyles ?? []).map((s) => s.title ?? "");
}

// 🔴 The state of all 19 solutions on merge. If either query stops being plain
// alphabetical here, the field has changed behaviour before anyone dragged
// anything — and if either returns nothing, a coalesce has been dropped and the
// band is empty site-wide with no error.
test("no styleOrder: both queries are plain alphabetical", async () => {
  const dataset = [solution(), ...STYLES];
  assert.deepEqual(await band(dataset), ["Box Inserts", "Gift Bags", "Labels"]);
  assert.deepEqual(await landing(dataset), ["Box Inserts", "Gift Bags", "Labels"]);
});

test("styleOrder set but empty: same as unset", async () => {
  const dataset = [solution({ styleOrder: [] }), ...STYLES];
  assert.deepEqual(await band(dataset), ["Box Inserts", "Gift Bags", "Labels"]);
  assert.deepEqual(await landing(dataset), ["Box Inserts", "Gift Bags", "Labels"]);
});

test("partial styleOrder: listed styles lead, in drag order; the rest alphabetically", async () => {
  const dataset = [solution({ styleOrder: [ref("c", "k1")] }), ...STYLES];
  assert.deepEqual(await band(dataset), ["Gift Bags", "Box Inserts", "Labels"]);
  assert.deepEqual(await landing(dataset), ["Gift Bags", "Box Inserts", "Labels"]);
});

test("full styleOrder: exactly the drag order", async () => {
  const dataset = [
    solution({ styleOrder: [ref("c", "k1"), ref("b", "k2"), ref("a", "k3")] }),
    ...STYLES,
  ];
  assert.deepEqual(await band(dataset), ["Gift Bags", "Labels", "Box Inserts"]);
  assert.deepEqual(await landing(dataset), ["Gift Bags", "Labels", "Box Inserts"]);
});

// The references are WEAK, so deleting a listed style succeeds and leaves the
// entry behind. It must not reach the site.
test("a dangling reference to a deleted style is dropped", async () => {
  const dataset = [
    solution({ styleOrder: [ref("c", "k1"), ref("DELETED", "k2"), ref("a", "k3")] }),
    ...STYLES,
  ];
  assert.deepEqual(await band(dataset), ["Gift Bags", "Box Inserts", "Labels"]);
  assert.deepEqual(await landing(dataset), ["Gift Bags", "Box Inserts", "Labels"]);
});

test("a styleOrder naming only deleted styles still returns the full band", async () => {
  const dataset = [solution({ styleOrder: [ref("GONE", "k1")] }), ...STYLES];
  assert.deepEqual(await band(dataset), ["Box Inserts", "Gift Bags", "Labels"]);
});

test("a solution with no styles returns an empty band, not a throw", async () => {
  assert.deepEqual(await band([solution({ styleOrder: [ref("GONE", "k1")] })]), []);
});

// The band query roots on the solution now, so the parent gate it always had has
// to keep working from its new position.
test("the collection band still respects the parent's status", async () => {
  // `status` replaced `hasPage` in PROD-2845. Not active is the successor of
  // `hasPage: false`, and it must hide the band exactly as the boolean did.
  const dataset = [solution({ status: "not-active" }), ...STYLES];
  assert.deepEqual(await band(dataset), []);
});

test("a style with no slug is left out of the band, pinned or not", async () => {
  const dataset = [
    solution({ styleOrder: [ref("d", "k1"), ref("a", "k2")] }),
    ...STYLES,
    { _id: "d", _type: "solutionStyle", status: "active", title: "Draft Style", solution: { _ref: "S" } },
  ];
  assert.deepEqual(await band(dataset), ["Box Inserts", "Gift Bags", "Labels"]);
});

// A Solution Style's OWN status gates it (it starts Not active). Before, only the
// parent solution was checked, so every new style under an Active solution was live.
test("a style that is not Active is out of both bands, its page and static params — pinned or not", async () => {
  const dataset = [
    solution({ styleOrder: [ref("off", "k1")] }),
    ...STYLES,
    style("off", "Aaa Hidden", { status: "not-active" }),
    style("soon", "Aab Soon", { status: "coming-soon" }),
    style("unset", "Aac Unset", { status: undefined }),
  ];
  assert.deepEqual(await band(dataset), ["Box Inserts", "Gift Bags", "Labels"]);
  assert.deepEqual(await landing(dataset), ["Box Inserts", "Gift Bags", "Labels"]);
  for (const styleSlug of ["off", "soon", "unset"]) {
    assert.equal(await run(SOLUTION_STYLE_BY_SLUGS_QUERY, dataset, { solutionSlug: "beauty", styleSlug }), null);
  }
  assert.notEqual(await run(SOLUTION_STYLE_BY_SLUGS_QUERY, dataset, { solutionSlug: "beauty", styleSlug: "a" }), null);
  const params = (await run(SOLUTION_STYLE_PAGE_PARAMS_QUERY, dataset, {})) as { styleSlug: string }[];
  assert.deepEqual(params.map((p) => p.styleSlug).sort(), ["a", "b", "c"]);
});
