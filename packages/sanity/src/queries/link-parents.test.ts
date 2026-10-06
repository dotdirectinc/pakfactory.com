import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import { isCatalogTargetVisible } from "../catalog-visibility.ts";
import { CASE_STUDY_BY_SLUG_QUERY } from "./case-studies.ts";
import { LINK_PARENTS_ON } from "./status-gates.ts";
import { WEBSITE_NAVIGATION_QUERY } from "./website-navigation.ts";

// Curated chrome links (nav, hero slides, finder rail, catalog rows, case-study chips)
// must agree with the pages: a target hidden by its PARENTS — rule 1 for products, R1
// for exclusive children — is not linked, even when its own status is Active.

const dataset = [
  { _id: "line", _type: "productLine", title: "Line", slug: { current: "line" }, status: "active" },
  { _id: "line-off", _type: "productLine", title: "Line off", slug: { current: "line-off" }, status: "not-active" },
  { _id: "style", _type: "productStyle", title: "Style", slug: { current: "style" }, productLine: { _ref: "line" } },
  { _id: "style-under-off", _type: "productStyle", title: "S2", slug: { current: "s2" }, productLine: { _ref: "line-off" } },
  { _id: "style-off", _type: "productStyle", title: "S3", slug: { current: "s3" }, productLine: { _ref: "line" }, status: "not-active" },
  { _id: "sol", _type: "solution", title: "Sol", slug: { current: "sol" }, status: "active" },
  { _id: "sol-off", _type: "solution", title: "Sol off", slug: { current: "sol-off" }, status: "not-active" },
  { _id: "ss-under-off", _type: "solutionStyle", title: "SS", slug: { current: "ss" }, solution: { _ref: "sol-off" }, status: "active" },
  { _id: "cat-off", _type: "customizationCategory", title: "C", slug: { current: "c" }, status: "not-active" },
  { _id: "type-under-off", _type: "customizationType", title: "T", category: { _ref: "cat-off" }, status: "active" },
  { _id: "opt-under-off", _type: "customizationOption", title: "O", slug: { current: "o" }, status: "active", appearsIn: "configurable-with-page", type: { _ref: "type-under-off" } },
  { _id: "p-ok", _type: "product", kind: "standard", title: "P", slug: { current: "p" }, status: "active", productLine: { _ref: "line" }, productStyle: [{ _ref: "style" }] },
  { _id: "p-styles-off", _type: "product", kind: "standard", title: "P2", slug: { current: "p2" }, status: "active", productLine: { _ref: "line" }, productStyle: [{ _ref: "style-off" }] },
  { _id: "p-line-off", _type: "product", kind: "standard", title: "P3", slug: { current: "p3" }, status: "active", productLine: { _ref: "line-off" }, productStyle: [{ _ref: "style" }] },
];

async function run(query: string, params: Record<string, unknown> = {}, extra: unknown[] = []) {
  return (await (await evaluate(parse(query), { dataset: [...dataset, ...extra] as never, params })).get()) as any;
}
const parentsOn = async (id: string) => run(`*[_id == $id][0]{"ok": ${LINK_PARENTS_ON}}.ok`, { id });

test("LINK_PARENTS_ON: rule 1 and R1 per type; open parents pass", async () => {
  assert.equal(await parentsOn("p-ok"), true);
  assert.equal(await parentsOn("p-styles-off"), false, "rule 1");
  assert.equal(await parentsOn("p-line-off"), false, "R1 product → line");
  assert.equal(await parentsOn("style"), true);
  assert.equal(await parentsOn("style-under-off"), false, "R1 style → line");
  assert.equal(await parentsOn("ss-under-off"), false, "R1 solution style → solution");
  assert.equal(await parentsOn("type-under-off"), false, "R1 type → category");
  assert.equal(await parentsOn("opt-under-off"), false, "R1 option → type → category");
  assert.equal(await parentsOn("sol"), true, "types without an exclusive parent pass");
});

test("isCatalogTargetVisible: parentsOn false hides an otherwise-visible target; unset keeps today's answer", () => {
  assert.equal(isCatalogTargetVisible({ _type: "product", status: "active" }), true);
  assert.equal(isCatalogTargetVisible({ _type: "product", status: "active", parentsOn: true }), true);
  assert.equal(isCatalogTargetVisible({ _type: "product", status: "active", parentsOn: false }), false);
  assert.equal(isCatalogTargetVisible({ _type: "productStyle", status: "active", parentsOn: false }), false);
  // parentsOn never makes a hidden target visible.
  assert.equal(isCatalogTargetVisible({ _type: "product", status: "not-active", parentsOn: true }), false);
});

test("nav: internal links project parentsOn, so the shared gate drops parent-hidden targets", async () => {
  const nav = {
    _id: "websiteNavigation", _type: "websiteNavigation",
    items: [{ _key: "i", label: "Shop", groups: [{ _key: "g", label: "G", items: [
      { _key: "a", label: "A", linkType: "internal", internalLink: { _ref: "p-ok" } },
      { _key: "b", label: "B", linkType: "internal", internalLink: { _ref: "p-line-off" } },
    ] }] }],
  };
  const doc = await run(WEBSITE_NAVIGATION_QUERY, {}, [nav]);
  const links = doc.items[0].groups[0].items;
  assert.deepEqual(links.map((l: any) => l.internalLink.parentsOn), [true, false]);
  assert.deepEqual(links.map((l: any) => isCatalogTargetVisible(l.internalLink)), [true, false]);
});

test("case-study chips stay as labels but only link when the target has a page", async () => {
  const cs = {
    _id: "cs", _type: "caseStudy", title: "CS", slug: { current: "cs" }, publishedAt: "2026-01-01T00:00:00Z",
    client: { _ref: "client" },
    products: [{ _ref: "line", _key: "a" }, { _ref: "line-off", _key: "b" }],
    capabilities: [{ _ref: "opt-under-off", _key: "c" }],
  };
  const client = { _id: "client", _type: "client", name: "Client", industry: { _ref: "sol-off" } };
  const doc = await run(CASE_STUDY_BY_SLUG_QUERY, { slug: "cs" }, [cs, client]);
  assert.deepEqual(doc.products.map((p: any) => [p.slug, p.linkable]), [["line", true], ["line-off", false]]);
  assert.deepEqual(doc.customizations.map((c: any) => c.linkable), [false]);
  assert.equal(doc.client.industry.linkable, false);
});
