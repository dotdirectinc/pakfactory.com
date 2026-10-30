import { test } from "node:test";
import assert from "node:assert/strict";
import { faqPage } from "./faqPage.ts";

test("faqPage emits one Question per answered item", () => {
  const node = faqPage({
    id: "https://pakfactory.com/products/custom-rigid-box#faq",
    items: [
      { question: "What is the minimum order?", answer: "500 units." },
      { question: "How long does it take?", answer: "22–25 business days." },
    ],
  });

  assert.ok(node, "a populated FAQ should produce a node");
  assert.equal(node["@type"], "FAQPage");
  assert.equal(
    node["@id"],
    "https://pakfactory.com/products/custom-rigid-box#faq",
  );
  assert.deepEqual(node.mainEntity, [
    {
      "@type": "Question",
      name: "What is the minimum order?",
      acceptedAnswer: { "@type": "Answer", text: "500 units." },
    },
    {
      "@type": "Question",
      name: "How long does it take?",
      acceptedAnswer: { "@type": "Answer", text: "22–25 business days." },
    },
  ]);
});

test("faqPage omits @id when none is given", () => {
  const node = faqPage({ items: [{ question: "Q", answer: "A" }] });

  assert.ok(node);
  assert.equal("@id" in node, false);
});

// 🔴 The reason this file exists. An empty FAQPage is a public claim that the
// page has an FAQ section with nothing in it — the shape `packages/seo` exists
// to avoid. Before PROD-3225 each caller guarded by hand and this returned
// `{"@type": "FAQPage", mainEntity: []}`.
test("faqPage returns null rather than an empty FAQPage", () => {
  assert.equal(faqPage({ items: [] }), null);
  assert.equal(faqPage({ id: "https://example.com/#faq", items: [] }), null);
});

test("faqPage returns null when every item is blank", () => {
  assert.equal(
    faqPage({
      items: [
        { question: "   ", answer: "An answer with no question." },
        { question: "A question with no answer.", answer: "" },
        { question: "", answer: "" },
      ],
    }),
    null,
  );
});

test("faqPage drops half-filled items and keeps the rest", () => {
  const node = faqPage({
    items: [
      { question: "Answered", answer: "Yes." },
      { question: "Unanswered", answer: "   " },
      { question: "  ", answer: "Orphan answer." },
    ],
  });

  assert.ok(node);
  assert.deepEqual(node.mainEntity, [
    {
      "@type": "Question",
      name: "Answered",
      acceptedAnswer: { "@type": "Answer", text: "Yes." },
    },
  ]);
});
