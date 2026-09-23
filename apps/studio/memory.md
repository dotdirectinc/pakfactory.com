# `@pakfactory/studio` — ops memory

> **Ops only — not policy canon.** Binding contracts: [`CLAUDE.md`](./CLAUDE.md) · [`AGENTS.md`](../../AGENTS.md).

Human and agent runbook for Sanity Studio. Binding contracts: [`CLAUDE.md`](./CLAUDE.md).

## Environment

Studio reads **`apps/studio/.env.local`** — not repo root (Vite).

```bash
cp apps/studio/.env.example apps/studio/.env.local
```

Keep `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` in sync with root `.env.local`.

| Var | Local example |
| --- | ------------- |
| `SANITY_STUDIO_PROJECT_ID` | your project id |
| `SANITY_STUDIO_DATASET` | `development` |
| `SANITY_STUDIO_PREVIEW_URL_WWW` | `http://localhost:3003/case-studies/` |
| `SANITY_STUDIO_PREVIEW_URL_BLOG` | `http://localhost:3004/` |

When adding vars consumed at build time, also update `turbo.json`.

## Dataset convention

- **Local dev:** `development`
- **Vercel production:** `production` on Next apps; Studio deploy uses project config

Full switching runbook: [`scripts/sanity/RUNBOOK.md`](../../scripts/sanity/RUNBOOK.md)

## Commands

| Task | Command |
| ---- | ------- |
| Dev | `pnpm dev:studio` → http://localhost:3333 |
| Deploy hosted Studio | `pnpm --filter @pakfactory/studio run deploy` |
| Full blog seed | `pnpm --filter @pakfactory/studio run seed` |
| Blog singleton pages | `pnpm --filter @pakfactory/studio run seed:blog-singleton-pages` |
| Beauty Solution LP + Solution Industry Page (WP4 / Phase B) | `pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset development` |

**HTTP 431 on `:3333`:** Vite/Node rejects oversized cookies. `dev`/`start` set `NODE_OPTIONS=--max-http-header-size=128000`. If it still 431s, clear site data for `http://localhost:3333` (or use a private window) and restart Studio.

**Agents do not run seeds** — humans only ([`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails).

## Solution Industry Page template

Industry LP **order + chrome** live on the pinned singleton `solutionIndustryPage` (Main Website → Listing Pages → Solution Industry Page). Each industry `solution` with `hasPage` **must** select it on the **Template** tab; band **content** stays on **Sections** (matched by `_key`). Logo wall may also carry a **shared default** client list on the template (Beauty seed); per-solution curatedItems override when set.

**Human seed:** run Beauty seed below with `--confirm` (creates template + Beauty wiring + solutionStyles). Agents author the script only — never `--confirm`.

## Beauty Solution LP seed (WP4 / Phase B)

Authors dependency docs, **`solutionIndustryPage`** (incl. shared logo wall clients), Beauty `sections[]` / `template` / `relatedCaseStudies`, and six Beauty **`solutionStyle`** docs (inspirationsGrid refs). **Required** for `/solutions/beauty-cosmetics` after Phase C (no local fixture fallback). Requires the six published `expertiseStage` docs.

```bash
# Dry-run (planned mutations only)
pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset development

# Write (needs SANITY_API_WRITE_TOKEN)
pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset development --confirm

# Production (two gates)
pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset production --confirm --yes-production
```

After `--confirm`:

1. Studio → Main Website → Listing Pages → **Solution Industry Page** → publish if draft; confirm 7 sections; **Logo wall** shows 6 clients (shared default).
2. Studio → Solutions → Beauty & Cosmetics → **Template** tab → Solution Industry Page; **Solution Styles** tab → 6 styles; **Sections** → content with matching keys (inspirations = style refs; logo wall = clients); publish if draft.
3. Reorder a section on Solution Industry Page → `/solutions/beauty-cosmetics` order updates without editing Beauty’s section order.
4. FAQ band: empty section FAQs → uses Categorization `faqs`; section FAQs filled → those only (override).
5. Inspirations: empty section cards → related `solutionStyle` children; section cards filled → those only.
6. Video case studies: empty section cards → Categorization `relatedCaseStudies`; section cards filled → those only.
7. www: `pnpm dev:www` → Beauty should render via merged template + content (`SectionRenderer`).

Parity checklist: [`apps/www/memory.md`](../www/memory.md) § Solution LP sections / Beauty LP seed parity.

## Section insert menu (entity tabs)

www `sections[]` insert tabs are **entity-named** (Solutions · Case studies · Products · Customizations · Expertise · Resources · Clients · Layout · CTAs) — not Proof / Catalogue / Market. Studio titles use `{Entity} row` for strip sections; `_type` stays stable. Thumbnails: `static/section-thumbnails/{_type}.webp` + `SECTION_PREVIEW_TYPES` (Beauty-first set shipped as placeholder chrome — replace with real band crops when design ready).

**In-section form:** All · Heading · Content · Layout (`sectionFieldGroups()`). Heading/intro/`link.query` support **Insert page field** chips (`%h1%`, `%title%`, `%description%`, `%shortName%`, `%shortDescription%`, `%slug%`) — www resolves from the host Solution (and later other hosts). Section chrome links: **Internal · Site path · External**; prefer Site path `/products` + Query `industry=%slug%` (env-safe, no hardcoded domain). **List source:** Page field / Derive chip vs Custom (`listSource` / `curatedSource`) on FAQ, case studies, inspirations, video CS, and sourced rows — empty custom does not silently inherit. Canon: [ADR-020 §8–10](../../docs/adr/0020-component-to-section-playbook.md).

## Test Kids Packaging seed (hero style products)

Fixture industry for Industry LP **hero tiles** from `solutionStyle` membership. All ids/slugs/skus use a **test-kids** / **TEST-KIDS** prefix for easy cleanup. Leaves Beauty styles alone.

Requires: `solutionIndustryPage` template + at least one **standard** product (for inspiration `basedOn`). Prefers a standard with ≥3 `availableCustomizations` so hero preview can show preselected options.

```bash
pnpm --filter @pakfactory/studio run seed:test-kids-solution-lp -- --dataset development
pnpm --filter @pakfactory/studio run seed:test-kids-solution-lp -- --dataset development --confirm
```

Creates:

- `solution.test-kids-packaging` (hasPage + template + `relatedCaseStudies`)
- 6 `solutionStyle.test-kids-*`
- 14 `product.test-kids-*` inspiration products (preselected customizations copied from `basedOn`)
- 3 `faq.test-kids-*`
- 4 `caseStudy.test-kids-*` + matching `client.test-kids-*` stubs

**Cleanup GROQ:**

```
*[_id match "solution.test-kids-*" || _id match "solutionStyle.test-kids-*" || _id match "product.test-kids-*" || _id match "faq.test-kids-*" || _id match "caseStudy.test-kids-*" || _id match "client.test-kids-*" || sku match "TEST-KIDS-*"]
```

**Verify:** Studio → Solutions → Test Kids Packaging → Solution Styles (match counts) + Categorization (`relatedCaseStudies`); www → `/solutions/test-kids-packaging` hero tiles open with customizations; case-study / video rows inherit from `relatedCaseStudies`.

## Presentation preview

1. Run `pnpm dev:www` (port 3003) and/or `pnpm dev:blog` (port 3004)
2. Run `pnpm dev:studio`
3. Studio → Presentation tool → pick www or blog location

## Cross-app local ports

| App | Dev URL |
| --- | ------- |
| www | http://localhost:3003 |
| blog | http://localhost:3004 |
| admin | http://localhost:4000 |
| studio | http://localhost:3333 |

## `.env.production`

Committed file contains public `SANITY_STUDIO_*` preview URLs for deployed Studio builds. **Deploy trap:** shell-exported `localhost` vars from `.env.local` can override `.env.production` during deploy — extract only the token when deploying.
