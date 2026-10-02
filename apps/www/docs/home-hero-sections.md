# Home hero sections (PROD-2666)

How the homepage hero is built, for humans and AI agents. Section rules live in [ADR-020](../../../docs/adr/0020-component-to-section-playbook.md) § Home hero sections. This file covers the www wiring.

## Shape

| Part | Owner | Source |
| --- | --- | --- |
| Route | `app/(site)/page.tsx` | `HOME_PAGE_QUERY` → `homePage.sections[]` → `SectionRenderer`. Metadata from `metaTitle` / `metaDescription`, then `title` |
| Hero | Editors | One of four Home-only sections (Studio → Home Page → Sections → **Heroes** tab). It renders the page H1 |
| Fallback | Route | A plain `PageHeadingSection` shows only while no hero section exists, so the page always has one H1 |
| Body | Editors | Every other allowed section, in editor order |

## The four heroes

All four share the copy fields: **Label above heading**, **Headline** (H1), **Intro**, **Primary button** and **Secondary button** (label, a one-line note under the button, and an Internal / Site path / External target), and **Show Google rating** (live score from Places, same source as the Reviews section).

| Studio | `_type` | React | What rotates / changes |
| --- | --- | --- | --- |
| Spotlight hero | `heroSpotlight` | `sections/hero-spotlight.tsx` → `ui/hero-spotlight-carousel.tsx` (`layout="split"`) | Copy left, stage right, labelled pager under the stage |
| Full-bleed hero | `heroSpotlightFullBleed` | `sections/hero-spotlight-full-bleed.tsx` → same carousel (`layout="fullBleed"`) | Active slide fills the band; copy over a scrim; caption bottom-right on desktop |
| Finder hero | `heroFinder` | `sections/hero-finder.tsx` → `ui/hero-finder-panel.tsx` | Two-line H1: "Custom [line]" / "for [industry] brands." — defaults Packaging Solution × All; shareable `?line=` / `?industry=` |
| Finder fullscreen | `heroFinderFullscreen` | `sections/hero-finder-fullscreen.tsx` → `ui/hero-finder-fullscreen-panel.tsx` | Same pickers; active result as fullscreen background (image or muted video) under a 30% black wash; dock rail slides kinds under a fixed DetailCard. **General** deck from Studio `defaultRail` — ordered flexible items (rail label + catalogue doc or campaign + banner image/video). **Specific** deck from rules (style → industry → case study) |

### Spotlight slides

`spotlight[]` takes 1–5 items. Each is a catalogue reference or a typed **Campaign**:

| Item | Image | Caption | Link |
| --- | --- | --- | --- |
| Case study | `heroMedia.image` → `cardImage` → `heroMedia.videoThumbnail`; `previewVideo` loops muted over it | Client, title, `cardSummary`, first `highlights` stat, product-line chips | Read case study |
| Product line / style | `featuredImage` (full-bleed cover) | `shortName`, `shortDescription` | Explore … |
| Industry (`solution`) | `featuredImage` | `shortName`, `shortDescription` | See … packaging |
| Campaign | Its own image | Title, description | Its own link label + target |

Hidden targets are dropped in `lib/sections/map-hero.ts` with `isCatalogTargetVisible` (coming-soon or non-customer-facing lines/styles, solutions without a page). A hero with no usable slides still renders its copy.

### Finder pairing

Editors pick the curated lines and industries. They never author pairs. Two **synthetic** options are always prepended (not Sanity documents):

- **Packaging Solution** (`packaging-solution`) — first in the line picker; links to `/products`
- **All** (`all`) — first in the industry picker; links to `/solutions`

Those are the page defaults.

**General deck** (Packaging Solution × All only): Studio fills five buckets on the Finder hero — Products, Industries, Customizations, Expertise, Case studies — each max 3 refs with optional feature image/video (else document featured media). `railOrder` is business (array order) or random within each bucket. Concatenate buckets in that category order.

**Specific deck** (any other pick), in order:

1. **Products** — up to 3 `productStyle`s on the selected line (omit when line is Packaging Solution)
2. **Industry** — selected industry and/or General industries with a true line match
3. **Customization** — General customization list as-is (no catalogue join yet)
4. **Expertise** — always the General expertise list
5. **Case studies** — up to 3 relative to the pair (`pickFinderStudies`), preferring General case-study membership when present

Case-study match quality for labels: **Case study** (true line match), **Related** (fallback / sentinel-derived), or **Industry** (no study). The industry picker keeps **All** first, then ranks curated options with a true line match ahead of the rest — all options stay selectable; the selection does not auto-jump when the line changes.

### Finder URL state

Picks sync to `?line=<slug>&industry=<slug>` via `lib/ui/use-query-param-state.ts` (`history.replaceState`, no RSC refetch). Defaults are the sentinels `packaging-solution` and `all` and are **omitted** from the URL so `/` stays clean. Invalid slugs fall back to those defaults. Back/forward re-seeds from the query string. The same hook is reusable for other simple string-param bands (catalog keeps its own facet-aware hook).

## Behaviour

- Autoplay every 7s (the `Steps` contract): pointer or focus inside the hero pauses it, choosing a slide stops it, `prefers-reduced-motion` never starts it. The active pager track fills via `.motion-tab-progress`.
- Copy uses `PageHeadingContent` with `settle`, so the build-in matches other heroes. The H1, CTAs and rating stay server-rendered; the stage and the Finder pickers are client islands.
- Finder pickers are non-modal dropdown chips styled as muted inline chips (`bg-muted`) so they read as part of the H1 sentence. The H1 always breaks after the product-line picker onto a second line starting with the join word (`for`) + industry picker + trail.
- Finder media rail: full-bleed `SectionCarousel` of `MediaCaptionCard`s from `buildFinderSlides` — **General** Studio buckets when Packaging Solution × All; **Specific** relatedness otherwise. Featured slot caption always on; peers reveal caption/video on hover. Card click (not drag) goes to the slide CTA.
- Cover media fills the card edge-to-edge (product, customization, case study, and campaign stills all use cover).

### Media loading (PROD-2753)

Every ambient video goes through `ui/cover-video.tsx`:

- **`preload="none"`.** No bytes are fetched until the video is within 200px of the viewport (IntersectionObserver).
- **Playback.** It plays only while it is both `active` and in view, and pauses when it scrolls out.
- **Posters.** When an optimized `SanityImage` already renders underneath (spotlight, finder fullscreen, `MediaCaptionCard`), the caller passes no `poster`; the image shows until the first frame. When nothing is underneath (`StagesBoard`), the poster is a Sanity CDN URL resized through `sanityImageLoader` (`posterWidth`, `q=75`, `auto=format`). Never pass a raw `cdn.sanity.io/images/...` URL: originals are 1–2.5 MB PNGs.
- **Video files.** Sanity serves video files as uploaded, with no transcoding. Keep each upload ≤ 3 MB, 720p, H.264. The 2026-10-01 baseline found 5–32 MB files on the homepage ([PROD-2752](https://dotdirect.atlassian.net/browse/PROD-2752)).

## Human setup (agents do not write documents)

1. Deploy the Studio schema (`pnpm sanity:deploy:staging`, then prod once approved).
2. In Studio → Home Page → Sections, insert one hero from the **Heroes** tab and move it to the top. Fill Headline, both buttons and 1–5 Spotlight items (or, for Finder / Finder fullscreen, 2–8 product lines and 2–8 industries). For **Finder**, fill the **General** buckets (or run `seed:finder-general` — see below). For **Finder fullscreen**, fill **Default rail** flexible items for the same default pair.
3. For Finder pairs to show the right study, make sure each industry's **Related case studies** and each case study's **Products** are filled.

## Rest of the homepage (PROD-2666)

Order: Hero → Clients (`logoWall`) → Products (`productLinesRow`) → Industries (`solutionsRow`) → Why PakFactory (`benefits`) → How it works (`steps`) → Case studies (`caseStudiesRow`) → By the numbers (`stats`) → Expertise (`expertiseSequence`) → Reviews (`testimonialsRow`) → FAQ (`faqSection`) → Get a quote (`generalCta`).

Newly rendered on www (they existed in Studio but drew nothing). This applies on **every** page that allows them, not just Home:

| `_type` | React | Notes |
| --- | --- | --- |
| `productLinesRow` | `ui/CatalogCardGrid` via `map-catalog-rows.ts` | Curated lines as general catalog cards; hidden / coming-soon lines dropped |
| `solutionsRow` | `ui/CatalogCardGrid` via `map-catalog-rows.ts` | Curated solutions; solutions without a page dropped |
| `stats` | `sections/stats.tsx` via `map-stats.ts` | Figure + label, dashed dieline dividers; GROQ now projects `items` |

`CatalogCardGrid` is the shared core extracted from `ProductStylesSection` (ADR-013). `ProductStylesSection` is now a thin wrapper that keeps the `#styles` / `product-styles-heading` anchors, and its behaviour is unchanged.

### Seed (`seed:home-page`)

Lays out the whole page above in order. Lists come from **real** dataset documents: clients with a logo, visible lines (images first), solutions with a page, recent case studies with a card image, listed expertise stages in end-to-end order, and up to 5 FAQs with scope "general". Heroes use stable keys `seed-hero-spotlight`, `seed-hero-full-bleed`, `seed-hero-finder`, and `seed-hero-finder-fullscreen` (same Finder pickers/copy; fullscreen also fills `defaultRail` as an ordered list of flexible items — catalogue refs for Product through Blog, plus a Promo campaign with banner image).

**Migrating an existing Home** (keep current sections, only reshape `defaultRail` seats → flexible array):

```bash
pnpm --filter @pakfactory/studio run migrate:finder-fs-default-rail -- --dataset development
pnpm --filter @pakfactory/studio run migrate:finder-fs-default-rail -- --dataset development --confirm
```

Benefits, Steps and Stats use copy approved on 2026-09-30; it lives in the `BENEFITS` / `STEPS` / `STATS` constants at the top of the script, so edit it there and re-run. The seed is idempotent (`seed-hero-*` / `seed-home-*` keys) and keeps any other sections after the seeded ones. Dry-run by default:

```bash
pnpm --filter @pakfactory/studio run seed:home-page -- --dataset development
pnpm --filter @pakfactory/studio run seed:home-page -- --dataset development --confirm
```

### Seed General buckets only (`seed:finder-general`)

Fills the five **General** arrays on the **first** `heroFinder` section already on `homePage` (published + draft if present). Does **not** reorder sections or rewrite other blocks — prefer this when the live Home layout must stay put. A full `seed:home-page` run still prepends seeded heroes and will reshuffle.

```bash
pnpm --filter @pakfactory/studio run seed:finder-general -- --dataset development
pnpm --filter @pakfactory/studio run seed:finder-general -- --dataset development --confirm
```

Stats ships with two figures (3,000+ brands served, 4.6 Google rating). Add more in Studio or in `STATS`.

Four review heroes mean four H1s. That is fine for a design review, not for launch. Keep one before publishing to production (e.g. move **Finder fullscreen** to the top and remove the extras).

