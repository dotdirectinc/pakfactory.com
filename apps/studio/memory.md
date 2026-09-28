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
| Beauty Pouches style products (catalog grid fixtures) | `pnpm --filter @pakfactory/studio run seed:beauty-style-products -- --dataset development` |

**HTTP 431 on `:3333`:** Vite/Node rejects oversized cookies. `dev`/`start` set `NODE_OPTIONS=--max-http-header-size=128000`. If it still 431s, clear site data for `http://localhost:3333` (or use a private window) and restart Studio.

**Agents do not run seeds** — humans only ([`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails).

## Main Website page templates (desk pattern)

**Main Website → {Domain} Pages** mirrors the public URL tree. Each row is a **template slot** for that level (section order/chrome; Product Line Pages also own hero shell). Entities live in their content workspaces and **pick** a template when the slot is listable.

| Domain | Levels (desk) | Today | Listable? |
| --- | --- | --- | --- |
| **Products** | Catalog → Line → Style → PDP | Four slots | **All listable.** Line / Style / Detail = entity-picked (`template`). Catalog hub = listable but www serves **Default** fixed id only |
| **Solutions** | Industry → Style | Both listable | **Industry + Style** entity-picked (`template`). Seeded Default ids keep fallback |
| **Expertise** | Hub → Stage Pages | Hub pin + listable stage templates | Already listable versions |
| **Case Studies** | Landing → Detail | Landing only (`caseStudiesPage`) | Landing stays **pinned** (shared `listingPage` type with Expertise hub). Detail out of MVP |
| **Customizations** | Catalog → Detail | Both listable | **Detail** entity-picked (`template`). Catalog hub = listable; www serves **Default** fixed id only |

**Rule:** **entity-picked** when many URLs share a slot — listable layout docs + `template` on the entity; www merges/uses `template.sections` with fallback to seeded Default id. **Hub Default-id live** when one URL — listable in Studio for draft layouts, but www still loads the fixed Default id until a settings “active layout” pointer exists. **Pinned** when the type is shared across hubs (`listingPage` for Case Studies / Expertise) so a type list would mix unrelated docs. Seed **Default** at the stable id (`productLinePage`, `productStylePage`, `productCatalogPage`, …).

### Wave 2 pattern (entity-picked vs hub Default-id vs pinned)

| Pattern | Types | Studio | www |
| --- | --- | --- | --- |
| Entity-picked | `productStylePage`, `solutionStylePage`, `customizationDetailPage` (+ Wave 1 Line / Industry / PDP) | Listable; entity **Template** tab | Prefer `entity.template->sections`; fallback Default fixed id |
| Hub Default-id live | `productCatalogPage`, `customizationCatalogPage` | Listable (prep drafts OK) | Always `_id == "…CatalogPage"` until settings pointer |
| Still pinned | `caseStudiesPage` (`listingPage`) | Fixed-id editor | Fixed id |

## Solution Industry Page layouts

Industry LP **order + chrome** live on listable `solutionIndustryPage` documents (Main Website → Solution Pages → Solution Industry Pages). Each industry `solution` with `hasPage` **must** select one on the **Template** tab; band **content** stays on **Sections** (matched by `_key`). Logo wall may also carry a **shared default** client list on the layout (Beauty seed); per-solution curatedItems override when set. Seeded Default id: `solutionIndustryPage`.

Optional **Preview image** on each layout (Studio list + Template picker only).

**Human seed:** run Beauty seed below with `--confirm` (creates/updates Default layout + Beauty wiring + solutionStyles). Agents author the script only — never `--confirm`.

## Product Line Page layouts

Product Line LP **hero shell + section order/chrome** live on listable `productLinePage` documents (Main Website → Product Pages → Product Line Pages) — not a pinned singleton. Each customer-facing `productLine` **must** select one on the **Template** tab; band **content** stays on **Sections** (matched by `_key`). www merges template × line sections; `productStylesRow` with `listSource` = Line styles inherits each line’s styles. Shell (`heroLayout`: `stack` \| `bottomBar`) is a field on the layout doc.

Seeded layout ids:

| Doc id | Title | Shell | Typical use |
| --- | --- | --- | --- |
| `productLinePage` | Default | `stack` | Most customer-facing lines |
| `productLinePage.bottomBar` | Bottom bar | `bottomBar` | `rigid-boxes` |

Need a different section arrangement for one line later? Create another Product Line Page layout (same type), rearrange `sections[]`, point that line’s `template` at it.

**Preview image (Studio chrome):** optional **Preview image** on each layout. Upload a ~640×360 crop of that shell’s hero from staging (or Figma). It appears in the Product Line Pages list and in the product line **Template** picker so editors can tell Default vs Bottom bar at a glance. Leave empty to keep the default package icon. Not shown on the site. Agents do not upload images.

**Human seed (layouts + Product style row):**

```bash
# Dry-run
pnpm --filter @pakfactory/studio run seed:product-line-page-styles -- --dataset development

# Write (needs SANITY_API_WRITE_TOKEN)
pnpm --filter @pakfactory/studio run seed:product-line-page-styles -- --dataset development --confirm
```

Creates/updates **Default** + **Bottom bar** layouts with a `productStylesRow` (`_key` `product-line-styles`, heading `Explore %title% styles`, empty cards → inherit). Sets `template` → Default (`productLinePage`) on customer-facing lines that lack it; points `rigid-boxes` at Bottom bar; unsets retired per-line `heroLayout`. Agents do not run `--confirm`.

Humans may also create layouts in Studio, set **Hero layout**, optionally upload **Preview image**, publish, then set `template` on each customer-facing line. Re-running the seed with `--confirm` retitles existing docs to Default / Bottom bar when those ids are updated.

## Product Detail Page layouts

PDP **order + chrome** live on listable `productDetailPage` documents (Main Website → Product Pages → Product Detail Pages). Each `product` may select one on the **Template** tab; band **content** stays on the product **Sections** tab (matched by `_key`). Seeded Default id: `productDetailPage`. Empty template → current hardcoded PDP bands only.

Optional **Preview image** on each layout (Studio chrome only).

## Product / Customization / Style catalog pages (PROD-2589 / PROD-2607 / Wave 2)

Listable layout types; entity-picked slots use `template` with Default-id fallback. Catalog hubs are listable in Studio but www still serves the Default fixed id only.

| Doc | Studio path | Role |
| --- | --- | --- |
| `productCatalogPage` | Product Pages → Product Catalog Pages | hub `/products` — **Default id live** |
| `productLinePage` / `…bottomBar` | Product Pages → Product Line Pages | listable line LP layouts (`productLine.template`) |
| `productStylePage` | Product Pages → Product Style Pages | listable style catalog bands (`productStyle.template` → Default fallback) |
| `productDetailPage` | Product Pages → Product Detail Pages | listable PDP layouts (`product.template`) |
| `customizationCatalogPage` | Customization Pages → Catalog Pages | hub `/customizations` — **Default id live** |
| `customizationDetailPage` | Customization Pages → Detail Pages | listable detail bands (`customizationOption.template` → Default fallback) |
| `solutionIndustryPage` | Solution Pages → Solution Industry Pages | listable industry LP layouts |
| `solutionStylePage` | Solution Pages → Solution Style Pages | listable style catalog bands (`solutionStyle.template` → Default fallback) |

The faceted grids / detail chrome stay route-owned. CMS `sections[]` render **below** the grid (catalog/style/detail) or merge as a template (line / industry / PDP). H1 / intro / SEO stay hardcoded on www catalog indexes until a follow-up. Humans open each layout list, add sections, publish — agents do not create documents.

For style / customization detail: select a layout on the entity’s **Template** tab; empty → seeded Default bands. For catalog hubs: only edit/publish the Default id until an active-layout settings pointer ships — extra docs are prep only.

For PDPs: select a **Product Detail Page** layout on the product’s Template tab; band content stays on the product Sections tab (matched by `_key`). Empty template → current hardcoded PDP bands only.

## Product Style / Solution Style / Customization Detail layouts

Shared below-grid (or below-chrome) bands live on listable layout docs. Each `productStyle` / `solutionStyle` / `customizationOption` (when `hasPage`) may select one on the **Template** tab. Seeded Default ids: `productStylePage`, `solutionStylePage`, `customizationDetailPage`. www coalesce: entity `template->sections` else Default.

Optional **Preview image** on each layout (Studio list + Template picker only).

## Product / Customization catalog hubs (Default-id live)

`productCatalogPage` and `customizationCatalogPage` are listable so editors can draft alternate layouts, but www always fetches `_id == "productCatalogPage"` / `"customizationCatalogPage"`. Promote content onto Default (or wait for settings active-layout) before extra docs affect the site.

## General CTA closing band (PROD-2607)

Studio section **CTAs → General** (`generalCta`) is the single conversion band (former footer collaborate strip + Expertise closing CTA). Studio: **theme** (muted / dark — colors only), **align**, **paddingBlock**, dieline borders, optional **body**, **Button** link (label + Internal / Site path / External). Empty button → `FOOTER_CTA` (/contact). www renders via `GeneralCta` only — `quoteCta` removed. Chrome footer no longer includes that band.

Human seed appends `_key: general-cta-closing` to the page templates above (catalog/style/PDP/industry pins + both Product Line Page layouts; creates stubs if missing). Agents do not `--confirm`.

```bash
pnpm --filter @pakfactory/studio run seed:general-cta-pages -- --dataset development
pnpm --filter @pakfactory/studio run seed:general-cta-pages -- --dataset development --confirm
```

After `--confirm`: publish each pin/layout if draft; verify a catalog/LP/PDP page shows the collaborate band above the site footer.

### Expertise closing band reseed (replace `quoteCta` / ctaTarget)

After schema deploy, reseed Expertise stages so the final CTA is `generalCta` (`theme: inverse`, `align: left`, `link` → Site path `/request`). Until reseed, closing bands with leftover `quoteCta` / `ctaTarget` fields will not render correctly.

```bash
pnpm --filter @pakfactory/studio run seed:expertise-design -- --dataset development --confirm
pnpm --filter @pakfactory/studio run seed:expertise-strategy -- --dataset development --confirm
```

Verify `/expertise/packaging-design` (and strategy) shows the dark left-aligned closing band; button opens the request flow.

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

1. Studio → Main Website → Solution Pages → **Solution Industry Page** → publish if draft; confirm 8 sections; **Logo wall** shows 6 clients (shared default).
2. Studio → Solutions → Beauty & Cosmetics → **Template** tab → Solution Industry Page; **Solution Styles** tab → 6 styles; **Sections** → content with matching keys (inspirations = style refs; logo wall = clients; Reviews = chrome-only); publish if draft.
3. Reorder a section on Solution Industry Page → `/solutions/beauty-cosmetics` order updates without editing Beauty’s section order.
4. FAQ band: empty section FAQs → uses Categorization `faqs`; section FAQs filled → those only (override).
5. Inspirations: empty section cards → related `solutionStyle` children; section cards filled → those only.
6. Video case studies: empty section cards → Categorization `relatedCaseStudies`; section cards filled → those only.
7. www: `pnpm dev:www` → Beauty should render via merged template + content (`SectionRenderer`).

Parity checklist: [`apps/www/memory.md`](../www/memory.md) § Solution LP sections / Beauty LP seed parity.

## Beauty Pouches style products seed

Fixture **inspiration** products for Beauty’s `beauty-pouches` `solutionStyle` keyword filter so `/solutions/beauty-cosmetics/beauty-pouches` shows a catalog grid. Does **not** create the style or industry LP — run Beauty LP seed first.

Requires: `solution.beauty-cosmetics` + `solutionStyle.beauty-beauty-pouches`, and at least one **standard** product (for inspiration `basedOn`). Prefers a standard with ≥3 `availableCustomizations`.

```bash
pnpm --filter @pakfactory/studio run seed:beauty-style-products -- --dataset development
pnpm --filter @pakfactory/studio run seed:beauty-style-products -- --dataset development --confirm
```

Creates 3 docs: `product.beauty-pouches-seed-1` … `-3` (titles `Beauty Pouches — Seed N`, sku `BEAUTY-POUCHES-00N`, Beauty in `solutions[]`).

**Cleanup GROQ:**

```
*[_id match "product.beauty-pouches-seed-*" || sku match "BEAUTY-POUCHES-*"]
```

**Verify:** www → http://localhost:3003/solutions/beauty-cosmetics/beauty-pouches (revalidate ~60s or hard refresh).

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
