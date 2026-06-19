import type { FaqPageInput } from "../types";

export function faqPage(input: FaqPageInput): Record<string, unknown> {
  const items = input.items.filter(
    (item) => item.question.trim() && item.answer.trim(),
  );
  if (items.length === 0) {
    return { "@type": "FAQPage", mainEntity: [] };
  }

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
