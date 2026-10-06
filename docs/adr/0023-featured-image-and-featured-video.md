# ADR-023: Featured image + Featured video — role-named catalog media

**Status:** **Accepted** (2026-10-01). Ratified with [PROD-2737](https://dotdirect.atlassian.net/browse/PROD-2737) Phase 1. Applies to `studio`, `www` (all catalog document types).

## Context

Catalog documents need a representative still (cards, nav, social) and sometimes an ambient or hover video. Product, Product Line, Product Style, Solution, Solution Style, and Bundle already use a singular **`featuredImage`** field named for that **role**. Product, Product Line, Expertise Stage, and Customization Option use the shared **`featuredVideo`** object via `featuredVideoField()`.

Customization Option still treated **`media[0]`** as the hero / card still — a positional rule. That collides with D33 (name the role, never the render slot): reordering a gallery must not silently change which image represents the document. Legacy keys such as `cardImage`, `heroImage`, and `heroMedia` remain only as GROQ coalesce fallbacks until content is cleared; they must not be introduced on new work.

There was no register entry locking this pattern for **all** catalog types, so Option (and future types) could diverge again.

## Decision

### 1. Role-named fields only

| Field | Role |
| --- | --- |
| `featuredImage` | The one still that represents the document — library/catalog cards, detail poster, nav, social fallback |
| `featuredVideo` | Optional ambient / hover / scrub video — shared Studio object (`upload` \| S3/CDN `url` \| `youtube`) via `featuredVideoField()` |
| `media[]` | Additional gallery frames only — **not** the card source |

- Do **not** invent plural `featuredImages`, image\|video unions inside `media[]`, or new render-slot names (`cardImage`, `heroImage`, `heroMedia`) on schemas.
- Field order on Content: **Featured image → Featured video** (when video applies) → **Media**.
- Studio copy on `media` must say card/social come from Featured image (same wording as Product / Product Line).
- YouTube may be stored on `featuredVideo`; ambient front-ends resolve a playable file URL only (upload/URL). When null, keep the Featured image still. Mobile and `prefers-reduced-motion` keep the still.

### 2. www projection rule

Cards and list thumbs project **`coalesce(featuredImage, …legacy)`** (and, where content predates Featured image, temporary `media[0]` coalesce). Once `featuredImage` is set, it is the primary. Never treat `media[0]` alone as the long-term card source.

Detail galleries may compose slides as **`[featuredImage?, …media]`** (dedupe by asset URL). Hover/ambient video overlays index 0 when a playable `featuredVideoUrl` exists.

### 3. Inventory (current)

| Pattern | Types |
| --- | --- |
| Featured image + Featured video + Media | Product, Product Line, **Customization Option** (PROD-2737) |
| Featured image (+ Media where used); video N/A today | Product Style, Solution, Solution Style, Bundle |
| Featured video without Featured image today | Expertise Stage (`diagram` is a different role — follow-up; do not rename in PROD-2737) |

New catalog types that need a representative still **must** add `featuredImage`. Types that need ambient video **must** use `featuredVideoField()`, not ad-hoc file fields.

## Consequences

- Customization Option gains `featuredImage`; library GROQ coalesces Featured image over `media[0]` so existing content keeps rendering until editors backfill.
- Library **card hover** rules (Featured video when both featured still + video exist; else second Media image; single Media = static) are product business rules documented in [`apps/www/docs/customizations-catalog.md`](../../apps/www/docs/customizations-catalog.md) § Business rules — customization card media — not restated here.
- Content backfill (copy hero stills into Featured image) is editorial / a future migration ticket — not an agent Sanity write.
- Expertise Stage Featured image and adding Featured video to Solution / Bundle / Style are out of PROD-2737 scope; they follow this ADR when scheduled.
- ADR-004 (media library / tagged images) still governs *how* images are stored; this ADR governs *which fields* carry representative vs gallery roles.

## Related

- D33 role naming (field named for role, never render slot) — Product Line / Solution schema comments
- [ADR-004](0004-media-library-strategy.md) — media library + asset alt
- Shared field helper: `apps/studio/lib/featured-video-field.ts`
- Shared GROQ: `packages/sanity/src/queries/featured-video.ts` (`FEATURED_VIDEO_URL_FIELD`)
- Ticket: PROD-2737
