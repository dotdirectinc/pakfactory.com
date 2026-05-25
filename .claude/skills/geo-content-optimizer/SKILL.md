---
name: geo-content-optimizer
description: >-
  Rewrites or outlines content for Generative Engine Optimization (GEO): citation-friendly
  structure, answer-first delivery, entity clarity, and optional FAQ JSON-LD alignment.
---

# GEO content optimizer — PakFactory blog

## When to use

- Long-form posts that should surface in **AI summaries**, **answer boxes**, and similar surfaces.
- Editing runner-up drafts from **`seo-content-writer`** for stronger entity and citation signals.

## Principles

1. **Answer first** — Opening paragraph states the outcome or definition before nuance.
2. **Declarative facts** — Prefer “X is …” / “Y applies when …” over vague marketing language.
3. **Named entities** — Materials, product categories, industries, standards — only when accurate to the brief or Sanity content.
4. **Chunk-friendly headings** — Each **H2** should label a self-contained idea LLMs can excerpt.
5. **Attribution** — When claiming performance or compliance, mention **source class** (“per supplier spec”, “typical for industry”) — never fabricate citations.

## FAQ and JSON-LD alignment

- If the outline includes **FAQ**, ensure each **on-page Q** has a short **direct answer** (2–4 sentences) suitable for **`FAQPage`** `Question` / `Answer` pairs.
- Do not add FAQ blocks that are not visible to readers.

## Formatting output

- Provide **rewritten sections** with **Before / After** only when editing existing copy; otherwise deliver the optimized draft as final text.
- End with **GEO rationale** (3–5 bullets): what changed and why it helps machine-readable summaries.

## Boundaries

- Maintain **[AGENTS.md](../../../AGENTS.md)** domain rules — quote/RFQ positioning, no carts.
- Do not recommend changing **`packages/ui`** primitives for GEO; focus on copy, headings, and metadata/schema implemented in **`apps/blog`**.
- JSON-LD and canonical URLs: **`@pakfactory/seo`** only; absolute URLs via **`getSiteUrl()`** (includes blog **`/blog`** prefix per PROD-1496).

## Pairing

- Works with **`seo-content-writer`** for initial drafts and **`on-page-seo-auditor`** for TSX/metadata verification.
