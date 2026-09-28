# `@pakfactory/www` — ops memory

> **Ops only — not policy canon.** Binding contracts: [`CLAUDE.md`](./CLAUDE.md) · [`AGENTS.md`](../../AGENTS.md) · [`DESIGN.md`](../../DESIGN.md) (UI).

Human and agent runbook for the www rebuild. Binding contracts live in [`CLAUDE.md`](./CLAUDE.md).

## Vercel

| Item | Value |
| ---- | ----- |
| Project | `pakfactory-com` (PakFactory's Projects team) |
| Production branch | **`main`** (live pakfactory.com stays on current www until launch) |
| Rebuild trunk | **`www-new-release`** |
| Stakeholder staging | [staging.pakfactory.com](https://staging.pakfactory.com) — preview deployment of `www-new-release`, Vercel Authentication required |
| QA git-branch alias | See root [`AGENTS.md`](../../AGENTS.md) § www rebuild trunk |

Staging is **never indexable** — `X-Robots-Tag: noindex, nofollow` on non-production + `robots.txt` disallow. Vercel auth wall is the primary gate.

## Local dev

```bash
pnpm dev:www    # http://localhost:3003
pnpm build:www && pnpm --filter @pakfactory/www start   # port 3000
```

Running `pnpm dev` from the repo root starts all apps via Turbo; www alone is `pnpm dev:www` → **3003**. Port **3000** is only `next start` after a production build.

## Environment

1. Copy root [`.env.example`](../../.env.example) → `.env.local` at repo root
2. Optional www overrides: copy [`apps/www/.env.example`](./.env.example) → `apps/www/.env.local`
3. `next.config.ts` calls `loadEnvConfig(repoRoot, …, forceReload: true)` — root vars win over app-level cache

**Minimum for local www:**

- Sanity: `NEXT_PUBLIC_SANITY_*`, `SANITY_API_READ_TOKEN`
- Supabase (auth): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**www-specific** (see `.env.example`): `SANITY_REVALIDATE_SECRET`, `WWW_DISABLE_INDEXING`, backend proxy secrets.

When adding a new env var, update **both** `.env.example` and `turbo.json` `@pakfactory/www#build` env list.

## Sanity revalidate

- Webhook target: `/api/revalidate`
- Secret: `SANITY_REVALIDATE_SECRET` (Bearer or `?secret=`)
- Include `_type == "websiteNavigation"` so header/footer chrome cache busts (`www-website-navigation`)
- Include `_type == "faq"` so an FAQ answer edit refreshes every page that shows it — catalog (lines, styles, products, customizations), solutions and expertise. **The production webhook's filter needs `"faq"` added in the Sanity dashboard**; the route handles it but the webhook must send it.
- Dev test webhook (`development` → `staging.pakfactory.com`) sends **no `_type`** (projection `{"sweep": true}`), so every publish clears everything and skips IndexNow / `publishedAt` stamping. Staging's firewall rule exempts only `/api/revalidate`.

## Website navigation singleton (chrome)

Site header + footer read Sanity `websiteNavigation` (not page sections). Header **MegaMenu** (PROD-2611) consumes each primary item’s **Mega-menu groups** + optional **Promo** (Featured hidden when empty) + optional **Footer CTA** (second row under the grid, e.g. “See all products”). Flat items (no real mega groups) stay simple links. Desktop panel is a persistent **4-column** grid (cols 1–2 primary split, no divider; col 3 secondary; col 4 promo rail) with `rounded-b-md` sheet.

After schema/seed updates (e.g. clearing Solutions group descriptors), humans re-run with an explicit dataset:

```bash
pnpm seed:website-navigation -- --dataset development
pnpm seed:website-navigation -- --dataset development --confirm
```

Or set Footer CTA per item in Studio → Navigation. Agents must not run seeds.

**Seed (humans only — agents must not run):** fetches live `productLine` + `hasPage` solutions and builds Products / Solutions mega groups. Prefer `path` links for product lines (`productLine` is not Studio-linkable) and `internal` refs for solutions. Solutions groups are seeded **without** `descriptor` (label only). Footer/social/AI preserved. `createOrReplace` overwrites the singleton. `--dataset` is **required** (no env fallback); without `--confirm` the run is a dry run.

```bash
pnpm seed:website-navigation -- --dataset development              # preview JSON + catalog counts
pnpm seed:website-navigation -- --dataset development --confirm    # write + attempt publish
pnpm seed:website-navigation -- --dataset production --confirm --yes-production
```

Then in Studio → Main Website → Navigation: confirm Products / Solutions groups; attach **Solutions promo image** if desired; publish. Refresh www (`pnpm dev:www`). Revalidate tag: `www-website-navigation`.

## Solution LP sections (CMS template path)

Industry LPs (`solutionType: industry` + `hasPage`) use **Solution Industry Page** (`solutionIndustryPage`) for section **order + chrome**, selected on the solution’s **Template** tab. Band **content** stays on `solution.sections[]`, matched by `_key`. www merges via `mergeSolutionSections` → `SectionRenderer`. **No local Beauty fixture dual-path** (Phase C / WP5).

## Product / Customization catalog sections (PROD-2589 / PROD-2607)

`/products` and `/customizations` keep route-owned faceted grids. Optional below-grid bands come from pinned singletons `productCatalogPage` / `customizationCatalogPage` (Main Website → Product Pages / Customization Pages). Empty or missing doc → grid only (today’s UX).

| Singleton | Route |
| --- | --- |
| `productStylePage` | below grid on `/products/[line]/[style]` |
| `productDetailPage` | PDP template × `product.sections` (select on product Template tab) |
| `customizationDetailPage` | below chrome on `/customizations/[category]/[handle]` |
| `solutionStylePage` | below grid on `/solutions/[slug]/[style]` |

**Hero tiles:** union of inspiration products matching any child `solutionStyle` via `@pakfactory/sanity/solution-style-filter` (cap 16). No mock carousel. Empty styles / empty matches → empty hero grid. Test fixtures: [`apps/studio/memory.md`](../studio/memory.md) § Test Kids Packaging seed → `/solutions/test-kids-packaging`. Beauty Pouches catalog fixtures: [`apps/studio/memory.md`](../studio/memory.md) § Beauty Pouches style products seed → `/solutions/beauty-cosmetics/beauty-pouches`.

**Studio**

- Main Website → Solution Pages → **Solution Industry Page** / **Solution Style Page**
- Main Website → Product Pages → **Product Detail Page** (plus Catalog / Line / Style)
- Main Website → Customization Pages → **Customization Detail Page**
- Solution → Template tab → Solution Industry Page (**required** for industry + `hasPage`)
- Product → Template tab → Product Detail Page (optional; empty → hardcoded PDP bands only)
- Solution / Product → Sections tab → page-specific content (keys aligned with the template)

**General CTA:** CTAs → **General** (`generalCta`) is the only conversion band (former footer strip + Expertise closing CTA). Studio: **theme** (colors only), **align**, **paddingBlock**, dieline borders, optional **body**, **Button** link. Empty link → `FOOTER_CTA`. Chrome footer no longer renders this strip. Human seeds: [`apps/studio/memory.md`](../studio/memory.md) § General CTA closing band + Expertise closing band reseed. Empty/missing section → no band.

**Human verify (agents do not write Sanity docs):**

1. After Phase B seed: `/solutions/beauty-cosmetics` renders merged CMS sections (hero + SectionRenderer). Empty Sanity → 404 (no fixtures).
2. Reorder Solution Industry Page → Beauty order updates without editing Beauty’s section order.
3. Case studies row: empty curated on the band → uses `relatedCaseStudies`; curated set → those only.
4. FAQ band: empty `faqSection.faqs` → uses document Categorization `faqs`; section refs filled → those only (override). Same inherit pattern as case studies.
5. Inspirations: empty `inspirationsGrid.cards` → related `solutionStyle` children; section cards filled → those only (`applyInspirationsInherit`).
6. Video case studies: empty `videoCaseStudiesRow.cards` → `relatedCaseStudies` (video-shaped); section cards filled → those only (`applyVideoCaseStudiesInherit`).
7. Logo wall: Industry Page may carry shared default clients; Beauty curatedItems override when set. After seed both show 6 mock clients.
8. Confirm bands: `logoWall`, `inspirationsGrid`, `mediaFeature`, `expertiseSequence`, `caseStudiesRow`, `videoCaseStudiesRow`, `testimonialsRow`, `faqSection` (+ shared chrome on the template).
9. Unwired type (e.g. `richText`) → page loads; dev shows amber placeholder; prod skips until wired.
10. **Reviews** (`testimonialsRow`) — chrome from CMS; quote items from live Google Places (PROD-2587). Places Place Details returns **max 5** review bodies (product wants ≥10 → [PROD-2591](https://dotdirect.atlassian.net/browse/PROD-2591) GBP registration). Long quotes truncate at 160 chars with **Read more** → review `googleMapsUri`. Studio **Content** tab: read-only Google reviews notice + **Layout** radio (defaults to **Carousel**, including unset; **Marquee** = dual-row auto-scroll + pause) + **Rating summary** radio (**Under reviews** footer default, or **Replace eyebrow** = Google aggregate instead of `[ Reviews ]`). Marquee cards ~`24rem`. **View all reviews** via Heading section link (`SectionHeading` CTA: `end` when left-aligned, under heading when center), or defaults to place `googleMapsLinks.reviewsUri` / `googleMapsUri` when the CMS link is empty. Shared 24h Place-ID cache (`GOOGLE_PLACES_PLACE_ID` + `GOOGLE_PLACES_API_KEY`); section is Suspense-wrapped so Places latency does not block above-fold. Missing env / API error / zero 4–5★ → section hidden. PDP still uses mocks until wired.

Wired: `faqSection`, `logoWall`, `mediaFeature`, `expertiseSequence`, `caseStudiesRow`, `inspirationsGrid`, `videoCaseStudiesRow`, `testimonialsRow`, `generalCta`. Merge: `apps/www/src/lib/sections/merge-solution-sections.ts` (`applyFaqInherit` / `applyCaseStudyInherit` / `applyInspirationsInherit` / `applyVideoCaseStudiesInherit`).

**Catalog FAQs inherit down the tree — line → style → product** (Richard, 2026-09-28; #675). A page shows the **nearest level with any FAQ**, and that list replaces everything above it: one FAQ curated on a product = that one only, nothing merges. Nothing is copied into the dataset — it resolves at render:

- **Product (PDP):** GROQ `PRODUCT_FAQS_INHERITED` in `packages/sanity/src/queries/catalog.ts` — own → first style (`productStyle[0]`, the one its card shows) → line. The line is the product's own `productLine` (presets: via `basedOn`), falling back to the style's line; 78 dev products have a line none of their styles belong to, so "via the style" would be wrong.
- **Style page:** `resolveStyleFaqs` (`src/lib/catalog/faq-inheritance.ts`) → `applyFaqInherit` into the template's FAQ section. ⚠️ The `productStylePage` template has **no `faqSection`** in development — until a designer adds one (list source *page*), style pages show no FAQs even though they resolve.
- Only expertise pages emit `FAQPage` JSON-LD, so inherited FAQs add no duplicate markup across ~1,250 PDPs.
- The FAQs themselves come from Notion via `populate:faqs` — [`scripts/sanity/CATALOG-REBUILD.md`](../../scripts/sanity/CATALOG-REBUILD.md) § FAQs.

**Insert menu:** Studio tabs are entity-named (Solutions · Case studies · Products · …). Editor titles may say “Case study row” / “Image with text” while `_type` / React names stay as above — three-layer drift is intentional ([ADR-020 §10](../../docs/adr/0020-component-to-section-playbook.md)).

**Heading tokens:** section `heading` / `intro` / `link.query` may include `%h1%` / `%title%` / `%description%` / `%shortName%` / `%shortDescription%` / `%slug%`; `applySectionTokens` runs after template merge using the host solution (`descriptionText` + `slug` from GROQ). Catalog CTAs: Site path `/products` + Query `industry=%slug%` (root-relative — current host on staging or prod). **List inherit:** `listSource` / `curatedSource` — `shouldInheritSectionList` skips fill when `custom`; host-agnostic for Product LPs later.

**Seed:** [`apps/studio/memory.md`](../studio/memory.md) § Beauty Solution LP seed.

## Beauty LP seed parity (WP4 / Phase B)

Human runbook (agents do not `--confirm`): [`apps/studio/memory.md`](../studio/memory.md) § Beauty Solution LP seed.

After a human runs `seed:beauty-solution-lp -- --dataset development --confirm`:

1. `/solutions/beauty-cosmetics` uses **merged** `solutionIndustryPage` + Beauty content sections (not fixture bands).
2. Beauty **Template** tab points at Solution Industry Page; section `_key`s match the singleton.
3. Band order: logo wall → inspirations → customizations (`mediaFeature`) → expertise → case studies → video case studies → Reviews (`testimonialsRow`) → FAQs.
4. Reorder on Solution Industry Page alone changes LP order.
5. After seed: Industry Page logo wall = 6 clients; Beauty Solution Styles tab = 6; inspirationsGrid cards = solutionStyle refs.
6. **Known deltas vs fixture (expected):**
   - Optional section `eyebrow` (Studio: “Label above heading”) via `sectionHeaderFields()`; highlight spans stay React-only.
   - `testimonialsRow` chrome from CMS; carousel quotes from live Google Places (shared 24h cache). Set `GOOGLE_PLACES_PLACE_ID` on Vercel.
   - Case-study cards may use `beauty-seed-*` stub slugs until real studies replace them.
   - Expertise stage titles/slugs come from CMS taxonomy (`packaging-strategy`, etc.).
   - Section CTA labels use `link.label` when set; otherwise fall back to “Learn more”.
   - Section align + `paddingBlock` (xs/sm/md/lg, default md) + dieline borders come from shared `sectionHeaderFields()`.
7. Fixture dual-path removed (Phase C / WP5) — Beauty without Sanity seed returns 404.

## Auth emails

Supabase email template setup: [`docs/auth-emails/README.md`](./docs/auth-emails/README.md)

## Cross-app local ports

| App | Dev URL |
| --- | ------- |
| www | http://localhost:3003 |
| blog | http://localhost:3004 |
| admin | http://localhost:4000 |
| studio | http://localhost:3333 |

Studio presentation preview should use www **3003** for `SANITY_STUDIO_PREVIEW_URL_WWW`.

## Deploy handoff

Use skill **deploy-www-release** (root `CLAUDE.md`) for Jira AC comment → push → PR `--base www-new-release`.
