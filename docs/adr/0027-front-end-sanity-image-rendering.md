# ADR-027: Front-end Sanity image rendering (`SanityImage`, LCP, settle)

**Status:** Accepted (2026-11-10). Motivated by compare polish ([PROD-3307](https://dotdirect.atlassian.net/browse/PROD-3307)) LCP console warnings on above-the-fold heroes. Complements [ADR-004](0004-media-library-strategy.md) (how assets are stored) and [ADR-024](0024-catalog-media-groups.md) (which CMS fields carry which stills). Does **not** change Studio schemas or GROQ field roles.

**Applies to:** `www` (primary); portable to `blog` / `admin` wherever `next/image` + Sanity CDN URLs are used.

## Context

Catalog and compare surfaces render many Sanity CDN stills through Next.js `Image`. Without shared rules we repeatedly hit:

1. **LCP / lazy-load warnings** — above-the-fold heroes default to lazy load; Next warns to use eager/`priority`.
2. **Blurry square crops** — landscape sources in `aspect-square` boxes look soft when the loader uses `fit=max` instead of a square centre crop.
3. **Aspect-ratio warnings** — CSS that sets only `height` or only `width` on `next/image` without `width: auto` / `height: auto` on the other axis.
4. **Inconsistent loaders** — raw `<img>`, bare `next/image`, or feature-local wrappers that skip watermark / settle / sizes.

House code already converges on [`SanityImage`](../../apps/www/src/components/ui/sanity-image.tsx), [`useSanityImageSettle`](../../apps/www/src/lib/sanity/use-sanity-image-settle.ts), and product-card `priority` for first-fold tiles. Compare heroes had to learn the same LCP rule after the fact.

## Decision

**When building or changing any UI that shows a Sanity (or watermarked Sanity) still in www, follow this rendering contract.**

### 1. Use `SanityImage` for Sanity CDN sources

- Prefer [`SanityImage`](../../apps/www/src/components/ui/sanity-image.tsx) over raw `next/image` or `<img>` for catalog / compare / section stills from Sanity.
- Pass `sizes` that match the rendered CSS size (do not omit and rely on the 100vw default).
- Opt into watermark only when the surface needs it (`applyWatermark`); cards, compare, and thumbs stay `false` unless product says otherwise.
- Cap CDN work with `maxLoaderWidth` when a small UI must not pull large srcset buckets (see component docs / PROD-3135).

### 2. Above-the-fold → `priority`; below-the-fold → default lazy

- **Above the fold** (heroes, first catalog row tiles that own LCP, sticky-critical brand marks that already use `priority`): pass **`priority`** on `SanityImage` / wrappers that forward it (e.g. [`CompareSettlingImage`](../../apps/www/src/components/compare/compare-settling-image.tsx), product card image). Next’s `priority` implies eager load and is the house substitute for hand-written `loading="eager"`.
- **Below the fold** (sticky mini-heads after scroll, dropdown thumbs, Works-with rows, offscreen cards): omit `priority`; keep lazy default.
- Do not mark every image on a page `priority` — only candidates that can be LCP or are intentionally preloaded.

### 3. Match crop loader to the box

- Square boxes (`aspect-square`, fixed square thumbs): set **`square`** so the Sanity loader centre-crops (`fit=crop`, `h=w`).
- Portrait cards that need 3:4: set **`portrait`**.
- Do not upscale a landscape `fit=max` URL into a square with CSS alone.

### 4. CSS size changes keep aspect ratio

- If CSS changes one axis of a `next/image` (e.g. `h-8`), set the other to **`auto`** (`w-auto` / `h-auto` or equivalent style). See site [`Logo`](../../apps/www/src/components/layout/logo.tsx).
- Prefer intrinsic `width`/`height` props that match the design size when not using `fill`.

### 5. Settle dissolve for catalog / compare stills

- Surfaces that should match catalog card load behaviour use **`useSanityImageSettle`** (or a thin feature wrapper like `CompareSettlingImage`) composed onto `SanityImage` `className` + `onLoad` / `onError`.
- Do not invent a second fade/settle stack per feature.

### 6. Feature wrappers stay thin

- Feature helpers (`CompareSettlingImage`, card image slots) may add `variant`, `sizes`, and `priority` defaults, but they **forward** into `SanityImage` — they do not reimplement loaders or watermark.

## Consequences

- Agents and humans treat this ADR as required reading before adding or changing image UI (together with ADR-004 / ADR-024 for content shape).
- New above-the-fold stills that skip `priority` are a defect, not a style preference.
- Extending `SanityImage` (new crop modes, loader caps) is preferred over forking `next/image` in a feature.
- Unrelated console noise (e.g. third-party `GET /json/version` 404s) is out of scope for this ADR.

## Related

- [ADR-004](0004-media-library-strategy.md) — asset library + alt/caption on the asset
- [ADR-023](0023-featured-image-and-featured-video.md) / [ADR-024](0024-catalog-media-groups.md) — which fields are the representative still
- Implementation anchors: `apps/www/src/components/ui/sanity-image.tsx`, `apps/www/src/lib/sanity/image.ts`, `apps/www/src/lib/sanity/use-sanity-image-settle.ts`, `apps/www/src/components/compare/compare-settling-image.tsx`
