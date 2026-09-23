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

## Website navigation singleton (chrome)

Site header + footer read Sanity `websiteNavigation` (not page sections). Seed mirrors the hardcoded V5 chrome for parity.

**Humans only** (agents must not run seeds — `AGENTS.md`):

```bash
pnpm seed:website-navigation              # write + attempt publish
pnpm seed:website-navigation -- --dry-run # print payload only
```

Then confirm in Studio → Main Website → Navigation. If the doc is draft-only, publish it. Refresh local www (`pnpm dev:www`) and check header labels/hrefs + footer columns/social/AI.

## Solution LP sections (CMS template path)

Industry LPs (`solutionType: industry` + `hasPage`) use **Solution Industry Page** (`solutionIndustryPage`) for section **order + chrome**, selected on the solution’s **Template** tab. Band **content** stays on `solution.sections[]`, matched by `_key`. www merges via `mergeSolutionSections` → `SectionRenderer`. **No local Beauty fixture dual-path** (Phase C / WP5).

**Hero tiles:** union of inspiration products matching any child `solutionStyle` via `@pakfactory/sanity/solution-style-filter` (cap 16). No mock carousel. Empty styles / empty matches → empty hero grid. Test fixtures: [`apps/studio/memory.md`](../studio/memory.md) § Test Kids Packaging seed → `/solutions/test-kids-packaging`.

**Studio**

- Main Website → Listing Pages → **Solution Industry Page**
- Solution → Template tab → Solution Industry Page (**required** for industry + `hasPage`)
- Solution → Sections tab → page-specific content (keys aligned with the template)

**Human verify (agents do not write Sanity docs):**

1. After Phase B seed: `/solutions/beauty-cosmetics` renders merged CMS sections (hero + SectionRenderer). Empty Sanity → 404 (no fixtures).
2. Reorder Solution Industry Page → Beauty order updates without editing Beauty’s section order.
3. Case studies row: empty curated on the band → uses `relatedCaseStudies`; curated set → those only.
4. FAQ band: empty `faqSection.faqs` → uses document Categorization `faqs`; section refs filled → those only (override). Same inherit pattern as case studies.
5. Inspirations: empty `inspirationsGrid.cards` → related `solutionStyle` children; section cards filled → those only (`applyInspirationsInherit`).
6. Video case studies: empty `videoCaseStudiesRow.cards` → `relatedCaseStudies` (video-shaped); section cards filled → those only (`applyVideoCaseStudiesInherit`).
7. Logo wall: Industry Page may carry shared default clients; Beauty curatedItems override when set. After seed both show 6 mock clients.
8. Confirm bands: `logoWall`, `inspirationsGrid`, `mediaFeature`, `expertiseSequence`, `caseStudiesRow`, `videoCaseStudiesRow`, `faqSection` (+ shared chrome on the template).
9. Unwired type (e.g. `richText`) → page loads; dev shows amber placeholder; prod skips until wired.
10. **Testimonials** deferred until shared `testimonial` doc (PROD-2293).

Wired: `faqSection`, `logoWall`, `mediaFeature`, `expertiseSequence`, `caseStudiesRow`, `inspirationsGrid`, `videoCaseStudiesRow`. Merge: `apps/www/src/lib/sections/merge-solution-sections.ts` (`applyFaqInherit` / `applyCaseStudyInherit` / `applyInspirationsInherit` / `applyVideoCaseStudiesInherit`).

**Insert menu:** Studio tabs are entity-named (Solutions · Case studies · Products · …). Editor titles may say “Case study row” / “Image with text” while `_type` / React names stay as above — three-layer drift is intentional ([ADR-020 §10](../../docs/adr/0020-component-to-section-playbook.md)).

**Heading tokens:** section `heading` / `intro` / `link.query` may include `%h1%` / `%title%` / `%description%` / `%shortName%` / `%shortDescription%` / `%slug%`; `applySectionTokens` runs after template merge using the host solution (`descriptionText` + `slug` from GROQ). Catalog CTAs: Site path `/products` + Query `industry=%slug%` (root-relative — current host on staging or prod).

**Seed:** [`apps/studio/memory.md`](../studio/memory.md) § Beauty Solution LP seed.

## Beauty LP seed parity (WP4 / Phase B)

Human runbook (agents do not `--confirm`): [`apps/studio/memory.md`](../studio/memory.md) § Beauty Solution LP seed.

After a human runs `seed:beauty-solution-lp -- --dataset development --confirm`:

1. `/solutions/beauty-cosmetics` uses **merged** `solutionIndustryPage` + Beauty content sections (not fixture bands).
2. Beauty **Template** tab points at Solution Industry Page; section `_key`s match the singleton.
3. Band order: logo wall → inspirations → customizations (`mediaFeature`) → expertise → case studies → video case studies → FAQs.
4. Reorder on Solution Industry Page alone changes LP order.
5. After seed: Industry Page logo wall = 6 clients; Beauty Solution Styles tab = 6; inspirationsGrid cards = solutionStyle refs.
6. **Known deltas vs fixture (expected):**
   - No eyebrows / highlight spans (D35 — presentation stays in React).
   - No testimonials until shared `testimonial` doc (PROD-2293); that band disappears once CMS sections render.
   - Case-study cards may use `beauty-seed-*` stub slugs until real studies replace them.
   - Expertise stage titles/slugs come from CMS taxonomy (`packaging-strategy`, etc.).
   - Section CTA labels use `link.label` when set; otherwise fall back to “Learn more”.
   - Section align + dieline borders come from shared `sectionHeaderFields()` (defaults: left, top off, bottom on).
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
