import type { FaqPageInput } from "../types";

/**
 * FAQPage node, or `null` when the page has no question worth stating.
 *
 * 🔴 The `null` is the point. `packages/seo` follows one rule — **omit, never
 * empty** — and this generator used to be the single place that broke it,
 * returning `{"@type": "FAQPage", mainEntity: []}` for empty input: a page
 * telling Google it has an FAQ section containing no questions.
 *
 * Every caller guarded against that by hand, so the rule held only as long as
 * each new caller remembered it. Returning `null` moves the decision here and
 * lets the type system enforce it — a caller that pushes the result without
 * checking no longer compiles (PROD-3225).
 *
 * A question with no answer, or an answer with no question, is dropped first:
 * markup must describe what the page actually shows.
 */
export function faqPage(input: FaqPageInput): Record<string, unknown> | null {
  const items = input.items.filter(
    (item) => item.question.trim() && item.answer.trim(),
  );
  if (items.length === 0) return null;

  return {
    "@type": "FAQPage",
    ...(input.id ? { "@id": input.id } : {}),
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
