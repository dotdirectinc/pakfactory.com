import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parse } from "groq-js";
import { CATALOG_PRODUCT_BY_SLUG_QUERY } from "./catalog.ts";

// Product FAQ resolution (PRODUCT_FAQS_INHERITED):
//   standard    → own → first style → line
//   inspiration → own → first solution (and nothing else)
const block = (text: string) => [
  { _type: "block", _key: "b", children: [{ _type: "span", _key: "s", text }] },
];
const faq = (id: string) => ({
  _id: id, _type: "faq", question: `Q ${id}`, answer: block(`A ${id}`),
});
const refs = (...ids: string[]) => ids.map((id) => ({ _ref: id, _key: id }));

const dataset = [
  faq("f-own"), faq("f-style"), faq("f-line"), faq("f-sol1"), faq("f-sol2"), faq("f-base"),
  { _id: "line", _type: "productLine", title: "Line", slug: { current: "line" }, faqs: refs("f-line") },
  { _id: "style", _type: "productStyle", title: "Style", slug: { current: "style" },
    productLine: { _ref: "line" }, faqs: refs("f-style") },
  { _id: "style-empty", _type: "productStyle", title: "Style", slug: { current: "style-empty" },
    productLine: { _ref: "line" } },
  { _id: "sol1", _type: "solution", title: "Sol 1", slug: { current: "sol1" }, faqs: refs("f-sol1") },
  { _id: "sol2", _type: "solution", title: "Sol 2", slug: { current: "sol2" }, faqs: refs("f-sol2") },
  { _id: "sol-empty", _type: "solution", title: "Sol empty", slug: { current: "sol-empty" } },
];

const standard = (slug: string, extra: Record<string, unknown> = {}) => ({
  _id: slug, _type: "product", kind: "standard", title: slug, slug: { current: slug },
  productLine: { _ref: "line" }, productStyle: [{ _ref: "style" }], ...extra,
});
const inspiration = (slug: string, extra: Record<string, unknown> = {}) => ({
  _id: slug, _type: "product", kind: "inspiration", title: slug, slug: { current: slug },
  basedOn: { _ref: "base" }, solutions: [{ _ref: "sol1" }, { _ref: "sol2" }], ...extra,
});

async function faqsFor(slug: string, docs: Record<string, unknown>[]) {
  const tree = parse(CATALOG_PRODUCT_BY_SLUG_QUERY);
  const result = await (await evaluate(tree, { dataset: [...dataset, ...docs], params: { slug } })).get();
  return (result?.faqs ?? []).map((f: { question: string }) => f.question);
}

const base = standard("base", { faqs: refs("f-base") });

test("standard: own FAQs win", async () => {
  assert.deepEqual(await faqsFor("p", [standard("p", { faqs: refs("f-own") })]), ["Q f-own"]);
});

test("standard: empty → first style, then line", async () => {
  assert.deepEqual(await faqsFor("p", [standard("p")]), ["Q f-style"]);
  assert.deepEqual(
    await faqsFor("p", [standard("p", { productStyle: [{ _ref: "style-empty" }] })]),
    ["Q f-line"],
  );
});

test("inspiration: own FAQs win", async () => {
  assert.deepEqual(await faqsFor("i", [base, inspiration("i", { faqs: refs("f-own") })]), ["Q f-own"]);
});

test("inspiration: empty → FIRST solution's FAQs only", async () => {
  assert.deepEqual(await faqsFor("i", [base, inspiration("i")]), ["Q f-sol1"]);
});

test("inspiration: never falls back to base product, style or line", async () => {
  const stale = inspiration("i", {
    solutions: [{ _ref: "sol-empty" }, { _ref: "sol2" }],
    // hidden fields left over from when it was standard
    productLine: { _ref: "line" },
    productStyle: [{ _ref: "style" }],
  });
  assert.deepEqual(await faqsFor("i", [base, stale]), []);
  assert.deepEqual(await faqsFor("i", [base, inspiration("i", { solutions: [] })]), []);
});
