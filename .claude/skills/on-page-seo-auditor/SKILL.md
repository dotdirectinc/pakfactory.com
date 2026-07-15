---
name: on-page-seo-auditor
description: >-
  Audits on-page SEO for Next.js blog routes and related TSX: metadata, JSON-LD, headings,
  OG/Twitter tags, and content structure. Outputs actionable findings with file references.
---

# On-page SEO auditor — PakFactory blog

## When to use

- Before publishing or after edits to **`apps/blog`** routes, layouts, or shared SEO helpers.
- When reviewing whether a page meets the **AEO/GEO** contract in **[apps/blog/CLAUDE.md](../../../apps/blog/CLAUDE.md)**.

## What to review

### Metadata (Next.js App Router)

- Presence of **`generateMetadata`** (or equivalent static **`metadata` export**) on post templates.
- **Title** unique per URL; length roughly **50–60** visible chars for primary keyword clarity.
- **Meta description** present; ~**150–160** chars; matches page intent without keyword stuffing.

### Social

- **Open Graph**: `og:title`, `og:description`, `og:image` (absolute URL where required), `og:type` (`article` for posts).
- **Twitter**: card type + title/description/image aligned with OG.

### Structured data

- **`BlogPosting`** (via **`@pakfactory/seo`**) in `@graph` with `@context`, `headline`, `datePublished`, `author`, `image`, `mainEntityOfPage`, `publisher` when available — **never** inline hand-built JSON-LD in routes.
- Canonical/OG/JSON-LD URLs must use **`getSiteUrl()`** (blog origin at deployment root, PROD-1496).
- **`FAQPage`** JSON-LD only when visible FAQ content exists on-page (add generator in `@pakfactory/seo` when needed).

### Robots (listing pages, PROD-1495)

- Post detail: **index, follow** (`getBlogRobotsDirective({ kind: 'post' })`).
- Blog index / archives: unfiltered pages (including page ≥2) → index + self-canonical; filter query params or non-default `perPage` → **noindex, follow** (`getListingRobotsFromSearchParams`).

### Content structure

- Single logical **H1** per view (usually post title).
- Heading hierarchy **H2 → H3** without skips where possible.
- Images have **descriptive `alt`** tied to content.

### Domain guardrails

- Flag any **cart/checkout/Shopify** assumptions — PakFactory is **not** a generic storefront (see **[AGENTS.md](../../../AGENTS.md)**).

## Output format

Emit sections:

1. **Summary** — Pass / Needs work (3 bullets max).
2. **Findings** — Table: Severity | Area | File | Issue | Suggestion.
3. **Structured data snippet** — Note missing or invalid JSON-LD fields.
4. **Next steps** — Ordered checklist for implementers.

Use **`file:line`** only when the tool actually resolved lines; otherwise use **file path + symbol** (e.g. `generateMetadata`).

## Alignment

- Sanity data paths must match **`@pakfactory/sanity`** — no inline GROQ in page files per **[apps/blog/CLAUDE.md](../../../apps/blog/CLAUDE.md)**.
