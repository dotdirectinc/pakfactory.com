# ADR-024: Catalog media groups — images, videos, lifestyle

**Status:** **Accepted**. Supersedes [ADR-023](0023-featured-image-and-featured-video.md) for Product, Product Line, Product Style, Customization Option, Solution, Solution Style, and Bundle. Applies to `studio`, `www`. Expertise Stage keeps ADR-023’s singular `featuredVideo` (no Featured image on that type).

## Context

ADR-023 gave catalog documents one representative still (`featuredImage`), one ambient video (`featuredVideo`), and a gallery (`media[]`). Editors now need separate lists for product stills, product motion, lifestyle stills, and lifestyle motion, with an explicit primary still in each image list so reordering does not change which image represents the document.

Staging Beauty and customization content already hold assets on the old keys. A copy-only migration must move asset references (hotspot, crop, alt) into the new arrays without re-uploading.

## Decision

### 1. Four media groups

| Field | Role |
| --- | --- |
| `images[]` | Product stills (front, side, any angle). Each item has alt text and a **Primary** flag. |
| `videos[]` | Product motion (box closing, etc.). Same source choices as the shared video object (`upload` \| S3/CDN `url` \| `youtube`) plus a **Thumbnail** image with alt. |
| `lifestyleImages[]` | In-context stills. Alt text and the same **Primary** flag. |
| `lifestyleVideos[]` | Lifestyle motion. Same video object with thumbnail. |

- Do **not** invent render-slot field names (`cardImage`, `heroImage`, `heroMedia`).
- Do **not** keep `featuredImage`, `media`, or `featuredVideo` on the seven types (hidden or visible). Remove them from those schemas. The shared `featuredVideo` object type remains for Expertise Stage.
- Field order on Content: **Images → Videos → Lifestyle images → Lifestyle videos**.

### 2. Primary flag

`primary` is a boolean on each item in `images[]` and `lifestyleImages[]`.

- At most one primary per list. Warn when a list has items and none is marked primary.
- Site resolution: the item with `primary == true`, otherwise the first item.
- Cards, nav, social fallback, and request thumbs use the primary **product** image (`images`). They do not use the lifestyle primary.
- The lifestyle primary is the representative in-context still when a surface needs one lifestyle image.

### 3. www projection and presentation

- Cards project the primary product image, with temporary GROQ coalesce to legacy `featuredImage` / `media[0]` when `images` is empty (so production documents keep rendering until a later production migration).
- Ambient / hover video: first playable upload/URL in `videos[]` (YouTube yields null). Poster: that video’s thumbnail, else the primary product still.
- Detail galleries list product images and product videos first; lifestyle media as a second group.
- Product stills and product video posters use the product inset scale (`scale(0.98)`). Lifestyle slides do not.

### 4. Inventory

| Pattern | Types |
| --- | --- |
| Four media groups | Product, Product Line, Product Style, Customization Option, Solution, Solution Style, Bundle |
| Featured video only (ADR-023) | Expertise Stage |

### 5. Migration scope

Copy asset refs on the **development** dataset, then unset the old keys. Do not write production as part of the initial cutover. Hosted Studio schema deploy waits until a production migration is scheduled.

## Consequences

- Shared Studio helpers define catalog image and catalog video array members once; each of the seven types wires the four fields with the correct media tags.
- Customization library hover rules update to primary still + first playable product video, else the next product still ([`apps/www/docs/customizations-catalog.md`](../../apps/www/docs/customizations-catalog.md)).
- Seed writers write `images[]` / `videos[]` only; they do not write the removed fields.
- ADR-004 still governs how images are stored; this ADR governs which fields carry product vs lifestyle roles and which still is primary.

## Related

- [ADR-023](0023-featured-image-and-featured-video.md) — superseded for the seven catalog types
- [ADR-004](0004-media-library-strategy.md) — media library + asset alt
- [ADR-021](0021-sanity-migration-register.md) — migration register
- Shared helpers: `apps/studio/lib/catalog-media-fields.ts`
- Shared GROQ: `packages/sanity/src/queries/catalog-media.ts`
