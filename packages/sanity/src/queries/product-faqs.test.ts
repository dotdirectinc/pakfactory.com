import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import {
  CATALOG_PRODUCT_BY_SLUG_QUERY,
  CATALOG_PRODUCT_LIBRARY_QUERY,
} from "./catalog.ts";

// Product FAQs and primary parents (Richard + Eric, 2026-10-06):
//   standard    → own → primary style (if on) → line
//   inspiration → own → primary solution (if Active) → nothing
//   rule 1: every parent off → the product is hidden
//   rule 2: the primary is fixed — never the second parent
//   rule 3: an off primary passes no FAQs down (a standard product still reaches its line)
const block = (text: string) => [
  { _type: "block", _key: "b", children: [{ _type: "span", _key: "s", text }] },
];
const faq = (id: string) => ({
  _id: id, _type: "faq", question: `Q ${id}`, answer: block(`A ${id}`),
});
const refs = (...ids: string[]) => ids.map((id) => ({ _ref: id, _key: id }));
const style = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id, _type: "productStyle", title: id, slug: { current: id },
  productLine: { _ref: "line" }, ...extra,
});
const solution = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id, _type: "solution", title: id, slug: { current: id }, ...extra,
});

const dataset = [
  faq("f-own"), faq("f-style"), faq("f-style2"), faq("f-line"), faq("f-sol1"), faq("f-sol2"),
  { _id: "line", _type: "productLine", title: "Line", slug: { current: "line" }, faqs: refs("f-line") },
  style("style", { faqs: refs("f-style") }),
  style("style2", { faqs: refs("f-style2") }),
  style("style-empty"),
  style("style-off", { status: "not-active", faqs: refs("f-style") }),
  style("style-soon", { status: "coming-soon", faqs: refs("f-style") }),
  style("style-internal", { status: "active-internal", faqs: refs("f-style") }),
  style("style-disc", { status: "discontinued", faqs: refs("f-style") }),
  solution("sol1", { status: "active", faqs: refs("f-sol1") }),
  solution("sol2", { status: "active", faqs: refs("f-sol2") }),
  solution("sol-off", { status: "not-active", faqs: refs("f-sol1") }),
  solution("sol-soon", { status: "coming-soon", faqs: refs("f-sol1") }),
  solution("sol-unset", { faqs: refs("f-sol1") }),
];

const standard = (slug: string, extra: Record<string, unknown> = {}) => ({
  _id: slug, _type: "product", kind: "standard", title: slug, slug: { current: slug },
  productLine: { _ref: "line" }, productStyle: [{ _ref: "style" }], ...extra,
});
const inspiration = (slug: string, extra: Record<string, unknown> = {}) => ({
  _id: slug, _type: "product", kind: "inspiration", title: slug, slug: { current: slug },
  basedOn: { _ref: "base" }, solutions: [{ _ref: "sol1" }, { _ref: "sol2" }], ...extra,
});
const base = standard("base");
const styles = (...ids: string[]) => ids.map((_ref) => ({ _ref }));

async function pdp(slug: string, docs: Record<string, unknown>[]) {
  return pdpQuery(slug, docs);
}
async function pdpQuery(slug: string, docs: Record<string, unknown>[]) {
  const tree = parse(CATALOG_PRODUCT_BY_SLUG_QUERY);
  return (await evaluate(tree, { dataset: [...dataset, ...docs], params: { slug } })).get();
}
async function faqsFor(slug: string, docs: Record<string, unknown>[]) {
  const result = await pdp(slug, docs);
  return (result?.faqs ?? []).map((f: { question: string }) => f.question);
}
async function librarySlugs(docs: Record<string, unknown>[]) {
  const tree = parse(CATALOG_PRODUCT_LIBRARY_QUERY);
  const rows = await (await evaluate(tree, { dataset: [...dataset, ...docs] })).get();
  return (rows as { slug: string }[]).map((r) => r.slug).sort();
}

// ─── FAQs ────────────────────────────────────────────────────────────────────

test("own FAQs win for both kinds, even with an off primary", async () => {
  assert.deepEqual(await faqsFor("p", [standard("p", { faqs: refs("f-own") })]), ["Q f-own"]);
  assert.deepEqual(
    await faqsFor("p", [standard("p", { faqs: refs("f-own"), productStyle: styles("style-off", "style") })]),
    ["Q f-own"],
  );
  assert.deepEqual(
    await faqsFor("i", [base, inspiration("i", { faqs: refs("f-own"), solutions: styles("sol-off", "sol1") })]),
    ["Q f-own"],
  );
});

test("standard: on primary → its FAQs, else the line's", async () => {
  assert.deepEqual(await faqsFor("p", [standard("p")]), ["Q f-style"]);
  assert.deepEqual(await faqsFor("p", [standard("p", { productStyle: styles("style-empty") })]), ["Q f-line"]);
});

test("standard: Active (Internal) and Discontinued primaries still pass FAQs down", async () => {
  assert.deepEqual(await faqsFor("p", [standard("p", { productStyle: styles("style-internal") })]), ["Q f-style"]);
  assert.deepEqual(await faqsFor("p", [standard("p", { productStyle: styles("style-disc") })]), ["Q f-style"]);
});

test("standard: off primary style is skipped — never the second style, always the line (rules 2 + 3)", async () => {
  for (const off of ["style-off", "style-soon"]) {
    assert.deepEqual(await faqsFor("p", [standard("p", { productStyle: styles(off, "style2") })]), ["Q f-line"]);
  }
});

test("standard: off primary style and a line with no FAQs → empty", async () => {
  const docs = [
    { _id: "line-nofaq", _type: "productLine", title: "L", slug: { current: "line-nofaq" } },
    standard("p", { productLine: { _ref: "line-nofaq" }, productStyle: styles("style-off", "style2") }),
  ];
  assert.deepEqual(await faqsFor("p", docs), []);
});

test("inspiration: Active primary solution → its FAQs, never the second's", async () => {
  assert.deepEqual(await faqsFor("i", [base, inspiration("i")]), ["Q f-sol1"]);
});

test("inspiration: off primary solution → empty, no fallback (rules 2 + 3)", async () => {
  for (const off of ["sol-off", "sol-soon", "sol-unset"]) {
    assert.deepEqual(await faqsFor("i", [base, inspiration("i", { solutions: styles(off, "sol2") })]), []);
  }
});

test("inspiration: never falls back to the base product, its style or line", async () => {
  const stale = inspiration("i", {
    solutions: styles("sol-off", "sol2"),
    productLine: { _ref: "line" },
    productStyle: styles("style"),
  });
  assert.deepEqual(await faqsFor("i", [base, stale]), []);
});

// ─── Rule 1: every parent off → hidden ──────────────────────────────────────

test("standard: hidden only when EVERY style is off", async () => {
  assert.equal(await pdp("p", [standard("p", { productStyle: styles("style-off") })]), null);
  assert.equal(await pdp("p", [standard("p", { productStyle: styles("style-off", "style-soon") })]), null);
  assert.notEqual(await pdp("p", [standard("p", { productStyle: styles("style-off", "style") })]), null);
});

test("standard: Active (Internal) and Discontinued styles keep the product up (R4)", async () => {
  assert.notEqual(await pdp("p", [standard("p", { productStyle: styles("style-internal") })]), null);
  assert.notEqual(await pdp("p", [standard("p", { productStyle: styles("style-disc") })]), null);
});

test("inspiration: hidden only when EVERY solution is off", async () => {
  assert.equal(await pdp("i", [base, inspiration("i", { solutions: styles("sol-off") })]), null);
  assert.equal(await pdp("i", [base, inspiration("i", { solutions: styles("sol-off", "sol-soon", "sol-unset") })]), null);
  assert.notEqual(await pdp("i", [base, inspiration("i", { solutions: styles("sol-off", "sol2") })]), null);
});

test("rule 1 applies to listings too", async () => {
  const slugs = await librarySlugs([
    base,
    standard("std-on", { productStyle: styles("style-off", "style") }),
    standard("std-hidden", { productStyle: styles("style-off") }),
    inspiration("insp-on", { solutions: styles("sol-off", "sol1") }),
    inspiration("insp-hidden", { solutions: styles("sol-off") }),
  ]);
  assert.deepEqual(slugs, ["base", "insp-on", "std-on"]);
});

// ─── Rule 2: breadcrumb keeps the fixed primary, linked only when it has a page ─

test("breadcrumb links follow the primary's own page, never a substitute", async () => {
  const on = await pdp("p", [standard("p")]);
  assert.deepEqual(on.breadcrumbLinks, { line: true, style: true, parent: false });
  assert.equal(on.productStyle.slug, "style");

  const off = await pdp("p", [standard("p", { productStyle: styles("style-off", "style") })]);
  assert.equal(off.productStyle.slug, "style-off", "the primary is fixed");
  assert.equal(off.breadcrumbLinks.style, false);

  const insp = await pdp("i", [base, inspiration("i", { solutions: styles("sol-off", "sol1") })]);
  assert.equal(insp.breadcrumbParent.slug, "sol-off", "the primary is fixed");
  assert.equal(insp.breadcrumbLinks.parent, false);
});

test("breadcrumb follows the primary solution; industry stays the first industry solution", async () => {
  const docs = [
    base,
    solution("use", { status: "active", solutionType: "useCase" }),
    solution("ind", { status: "active", solutionType: "industry" }),
    inspiration("i", { solutions: styles("use", "ind") }),
  ];
  const pdp = await pdpQuery("i", docs);
  assert.equal(pdp.breadcrumbParent.slug, "use", "solutions[0], even when it is not an industry");
  assert.equal(pdp.industry.slug, "ind");
  assert.equal(pdp.breadcrumbLinks.parent, true);
});
