# Page builder insert-menu thumbnails

Grid previews for the Blog Homepage **+ Add item** menu in Sanity Studio.

## File naming

One `.webp` per section `_type` (exact camelCase schema name):

| File | Block |
| --- | --- |
| `postFeaturedRow.webp` | Post — Featured Post |
| `postCategoryRow.webp` | Post — Category Row |
| `postSpotlightRow.webp` | Post — Spotlight Row |
| `tagStrip.webp` | Tag — Strip |
| `ctaNewsletter.webp` | CTA — Newsletter |
| `ctaRfq.webp` | CTA — RFQ / Quote |
| `ctaPillars.webp` | CTA — Pillars |
| `richTextBand.webp` | Rich text band (landing allowlist) |

Recommended size: ~400–600px wide, representative of the live block.

## Enable a thumbnail

1. Drop `{_type}.webp` in this folder.
2. Add the `_type` string to `PAGE_BUILDER_PREVIEW_TYPES` in [`apps/studio/schemas/blocks/page-builder-preview.ts`](../schemas/blocks/page-builder-preview.ts).
3. Hard-refresh Studio (`pnpm dev:studio`).

Until step 2, missing entries fall back to the block icon in the grid.
