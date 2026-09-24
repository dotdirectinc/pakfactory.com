# ADR-020: Component → Section playbook (www marketing pages)

**Status:** Proposed (2026-09-22) — **pending Eric's ratification**. Extends [ADR-015](0015-page-composition-sections-terminology.md) (Sections terminology) and [ADR-013](0013-shared-core-vs-feature-composition.md) (props-only shared UI). Does **not** rename blog `pageBuilder` or supersede ADR-012 for the blog.

**Applies to:** `www`, `studio` (section allowlists / inventory).

## Context

Industry Solution LPs (starting with `/solutions/beauty-cosmetics`) ship today as hard-wired React bands plus local fixtures. Studio already exposes `solution.sections` via `pageSectionsField(SECTION_ALLOW.marketPage)`, but www does not render that array yet.

Without a playbook, teams either:

1. turn every Figma band into a new Section type (presentation leaks into CMS, inventory bloat), or
2. keep everything in route code (editors cannot reorder or reuse).

We need a single gate for “when does this React band become a CMS Section?”, plus a finalized Beauty inventory so later work packages (renderer, renames, gap types, seed) do not invent conflicting `_type`s.

## Decision

### 1. Terminology

Use **Sections** for www page-composition arrays and React under `components/sections/` ([ADR-015](0015-page-composition-sections-terminology.md)). Blog keeps **block** / `pageBuilder` until ADR-015 is Accepted and PROD-2293 migrates the field.

### 2. Route gate — when a component may become a Section

Challenge the band **before** adding a Studio type or allowlist entry:

| Question | If yes → |
| -------- | -------- |
| Site chrome (nav / footer / breadcrumbs)? | **Not** a Section — `layout/` / route skeleton |
| URL hierarchy, filters, RFQ rails, primary catalog grids? | **Code skeleton** — structured route owns it; optional `doc.sections` only as a body slot |
| Editorial layout editors must **reorder** or reuse across page types? | **Section** — schema + allowlist + shared renderer |
| Visual choice only (“grey band”, “3 columns”, theme)? | **Reject** — presentation stays in React / design system (D35) |

**Solution LP shell:** breadcrumb + **hero stay route-owned** (fields on `solution`, not reorderable `sections[]`). Body **order + default chrome** live on the selected page template (`solution.template` → e.g. `solutionIndustryPage` singleton). Body **content** (logos, inspirations, …) lives on `solution.sections[]`, matched by stable `_key`. www merges template × content before `SectionRenderer`. Curated lists that also exist on the document follow **§8 Document defaults + section override**.

### 3. D35 — presentation-free Sections

Section schemas store **meaning** (heading, intro, references, typed content) — not layout chrome. Theme, column counts, and band styling live in the React section component. Aligns with Sanity’s “data over presentation” schema guidance.

**Documented exceptions** (shared via `sectionHeaderFields()`):

1. **Label above heading** — optional `eyebrow` string (Studio title: “Label above heading”); content kicker rendered by `SectionHeading` as `[ Label ]`.
2. **Header alignment** — `align` (`left` | `center`) controls how the section heading/intro read.
3. **Vertical padding** — `paddingBlock` (`xs` | `sm` | `md` | `lg`, default `md`) maps to `PageDielineSection` rhythm. Code-only `none` opts out of vertical padding.
4. **Dieline border toggles** — `showTopBorder` / `showBottomBorder` avoid double-dash when stacking bands (same pattern as blog page-builder blocks).

Do **not** add theme, column counts, gap, or band background fields to section schemas.

### 4. Allowlists

- One `sections` field per page-shaped type (`pageSectionsField`).
- Scope with `SECTION_ALLOW.*` — Solution LPs use `SECTION_ALLOW.marketPage` on both `solutionIndustryPage` (order) and `solution` (content).
- New `_type`s join the inventory **and** the relevant allowlist in the same change; never a second sections field on `solution` for a different job.

### 5. One job per Section

Each Section type does one editorial job. No mega-sections that glue logos + products + FAQs into one object.

### 6. Generalization (ADR-013)

- Props-only UI under `apps/www/src/components/sections/` (and `ui/` primitives).
- Feature wiring (map Sanity → props) stays thin in the solution feature / controller — no cross-feature imports, no forking a sibling feature’s band.
- Locked renames for Beauty cutover:
  - `SolutionInspirations` → **`InspirationGallery`**
  - `SolutionExpertise` → **`ExpertiseRow`** (composes `StagesBoard`)
  - `SolutionHero` → **stays route-owned** (not renamed into a Section)

### 7. New `_type` vs reuse

1. Prefer an **existing** inventory `_type` when the content shape matches.
2. Otherwise add a **new** Section type (schema + allowlist + renderer branch together).
3. For merchandising lists that are only partly catalogued, use a **mixed array** (reference **or** typed inline object) — Sanity’s reference-vs-embed practice, same doctrine as `faqsField({ mode: 'mixed' })`.

#### Mixed cards (Inspiration Gallery)

**UX analogy:** Shopify-style “pick catalogue items or append custom tiles.”  
**Modeling basis:** Sanity page-builder / schema guidance — default to objects; reference truly shared docs; hybrid arrays when needed ([Deciding fields and relationships](https://www.sanity.io/docs/developer-guides/deciding-fields-and-relationships)).

Editor rule: *Would this tile be useful on another page?*

- **Yes** → reference a catalogue doc (`solutionStyle` preferred for inspiration collections; `productStyle` / `product` when the tile *is* that entity).
- **No / not seeded yet** → typed inline card (title, description, image, link). Migrate typed → refs when the entity lands; do not leave forever-typed catalogue tiles.

Do **not** jam Beauty’s format tiles into `productsRow` / `productStylesRow` alone (wrong document shape and UI).

**Locked `_type`:** `inspirationsGrid` — `cards[]` of `reference | inspirationsCard`. Schema + renderer shipped in WP3.

### 8. Document defaults + section override (binding for new Sections)

When a band’s list can be curated **once on the page document** (Categorization / related fields) **and** optionally overridden **per section slot**:

| Layer | Owns | Studio |
| ----- | ---- | ------ |
| **Document default** | Shared curated list for the page (e.g. `solution.faqs`, `relatedCaseStudies`) | Keep the conversion floor here (`min` / required when the band must show) |
| **Section list source** | Explicit `listSource`: **Page field** chip (`page`) or **Custom list** (`custom`) | Default new sections to `page`. Custom + empty = show nothing (no silent fill) |
| **Section override array** | Same list shape (`faqSection.faqs`, `curatedItems`, …) | Hidden unless `listSource === 'custom'` |
| **Template** | Order + chrome; may seed shared defaults (e.g. logo wall) | |

**Priority (www merge):** non-empty section array → use it; else if `listSource` is `page` or unset (legacy) → inherit host list; if `listSource === 'custom'` → never inherit. Helper: `shouldInheritSectionList` in [`merge-solution-sections.ts`](../../apps/www/src/lib/sections/merge-solution-sections.ts). Host-agnostic — Product LPs later pass `product.faqs` the same way.

**Rows with derive:** `curatedSource` is `derive` (chip) or `custom`; same hide/show pattern via [`rowSectionFields()`](../../apps/studio/lib/row-section-fields.ts) + [`sectionListSourceField`](../../apps/studio/lib/section-list-source-fields.ts).

**Shipped defaults (host lists):**

- `relatedCaseStudies` → `caseStudiesRow` / `videoCaseStudiesRow` when `listSource` is page
- `solution.faqs` → `faqSection` when `listSource` is page
- Reverse-linked `solutionStyle` children → `inspirationsGrid` when `listSource` is page
- Industry template may seed a shared `logoWall` curated list; per-solution override when custom

**When creating a new Section that shows a curated list:**

1. Ask: is there a document-level list editors already maintain for this page type?
2. If yes → document field is default; section gets `listSource` + Page field chip; wire GROQ + merge inherit.
3. If no → section owns the list (and may use `min`); do not invent a second document field “just in case.”
4. Never require the same `min` on both document and section — that forces duplicate authorship and red chrome on templates.

### 9. Seeds and content writes

Agents may author seed scripts and schema. **Humans** run seeds and publish documents ([`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails).

### 10. Insert UX — entity tabs + Row naming

Editors find sections by **core CMS entity**, not inventory jargon (Proof / Catalogue / Market). Scan path: *“I need a Products block”* → open **Products** → pick Product row / Product line row / ….

**Insert tabs** (group `name` → title; empty tabs drop after `SECTION_ALLOW` filter):

| Tab `name` | Tab title | Section `_type`s |
| ---------- | --------- | ---------------- |
| `solution` | Solutions | `solutionsRow`, `inspirationsGrid` |
| `caseStudy` | Case studies | `caseStudiesRow`, `videoCaseStudiesRow` |
| `product` | Products | `productLinesRow`, `productStylesRow`, `productsRow`, `bundlesRow` |
| `customization` | Customizations | `customizationsRow`, `customizationsCatalog` |
| `expertise` | Expertise | `expertiseSequence`, `signatureSystem` |
| `resource` | Resources | `guidesRow`, `dielinesRow`, `glossaryStrip`, `postsRow` |
| `client` | Clients | `logoWall` |
| `layout` | Layout | `richText`, `mediaFeature`, `stats`, `steps`, `faqSection`, `testimonialsRow`, `benefits` |
| `cta` | CTAs | `quoteCta`, `newsletterCta`, `linkCards`, `contactForm` |

**Studio `title` patterns** (editor chrome only — `_type` stays stable per [ADR-014](0014-sanity-studio-naming.md)):

| Pattern | When | Example |
| ------- | ---- | ------- |
| `{Entity} row` | Shared [`rowSectionFields`](../../apps/studio/lib/row-section-fields.ts) strip | Case study row · Solution row · Product row |
| Job name | One-off layout / mixed / CTA | Image with text · Inspiration gallery · Get a quote |
| Disambiguator | Two types for one entity | Customization row vs Customizations library |

**Thumbnails:** optional grid art at `apps/studio/static/section-thumbnails/{_type}.webp`, registered in `SECTION_PREVIEW_TYPES` ([`section-preview.ts`](../../apps/studio/schemas/sections/section-preview.ts)). Array-item badges use [`SectionItemPreview`](../../apps/studio/components/SectionItemPreview.tsx) keyed by `_type` → entity tab (not title parsing).

#### Naming matrix (Studio title audit — titles only)

| `_type` | React (when wired) | Studio `title` |
| ------- | ------------------ | -------------- |
| `mediaFeature` | `TextWithImage` | Image with text |
| `inspirationsGrid` | `InspirationGallery` | Inspiration gallery |
| `expertiseSequence` | `ExpertiseRow` | Expertise stages |
| `logoWall` | `LogoWall` | Logo wall |
| `caseStudiesRow` | `CaseStudiesRow` | Case study row |
| `videoCaseStudiesRow` | `VideoCaseStudiesRow` | Video case studies |
| `faqSection` | `FaqSection` | FAQs |
| `signatureSystem` | `SignatureSystem` | Signature system |
| `benefits` | `Benefits` | Benefits |
| `solutionsRow` | (row inventory) | Solution row |
| `productsRow` | (row inventory) | Product row |
| `productLinesRow` | (row inventory) | Product line row |
| `productStylesRow` | (row inventory) | Product style row |
| `bundlesRow` | (row inventory) | Bundle row |
| `customizationsRow` | (row inventory) | Customization row |
| `customizationsCatalog` | catalog UI | Customizations library |
| `guidesRow` / `dielinesRow` / `glossaryStrip` / `postsRow` | (row inventory) | Guide / Dieline / Glossary / Post row |
| `richText` / `stats` / `steps` | — | Rich text / Stats / Steps |
| `quoteCta` | `QuoteCta` | Get a quote |
| `newsletterCta` / `linkCards` / `contactForm` | — | Newsletter / Link cards / Contact form |

Do **not** casually rename `_type` or drive-by rename React files outside the locked §6 list. Three-layer drift is intentional; editors only see Studio titles.

#### In-section field tabs (object form)

When editing a section in the array modal, tabs are **All (default) · Heading · Content · Layout** via [`sectionFieldGroups()`](../../apps/studio/lib/section-field-groups.ts). No named group is marked `default` (Studio prepends All). Declared order: `heading` → `content` → `layout`.

| Tab | Fields |
| --- | ------ |
| Heading | `eyebrow`, `heading`, `intro`, `link` |
| Content | Section payload (cards, curatedItems, body, …) |
| Layout | `align`, `paddingBlock`, dieline borders (D35 exceptions only) |

#### Heading / intro / link-query page-field chips

`eyebrow`, `heading`, `intro`, and section `link.query` use [`SectionTokenStringInput`](../../apps/studio/components/SectionTokenStringInput.tsx). Editors insert chips that store `%tokens%`; www resolves them from the **host page** at render ([`resolveSectionTokens`](../../apps/www/src/lib/sections/resolve-section-tokens.ts)).

| Chip | Token | Resolves |
| ---- | ----- | -------- |
| H1 | `%h1%` | `coalesce(h1, title)` |
| Title | `%title%` | `title` |
| Description | `%description%` | Plain text (`pt::text(description)` / `descriptionText`) |
| Short name | `%shortName%` | `coalesce(shortName, title)` |
| Short description | `%shortDescription%` | `shortDescription` |
| Slug | `%slug%` | Host document slug (e.g. solution slug) |

Example stored: `The best custom %h1% packaging` → on Beauty LP: *The best custom Beauty & Cosmetics packaging*. Industry template chrome can use the same pattern once for every solution.

#### Section link → catalog query

Section chrome links use **Internal · Site path · External** ([`sectionLinkTargetFields`](../../apps/studio/lib/section-link-target-fields.ts)). Prefer **Site path** for on-site routes — root-relative `/products` uses the current host (staging vs production); never hardcode `pakfactory.com`.

Optional freeform `link.query` (no leading `?`) appends after token resolve.

**Product row on a Solution LP:** Site path `/products` + Query `industry=%slug%` → `/products?industry=beauty-cosmetics`. Catalog facet keys: see [`products-catalog.md`](../../apps/www/docs/products-catalog.md).

### 11. Ship checklist for a new Section

**Before schema**

1. Pass the **route gate** (§2).
2. Prefer existing `_type`; else one job, one type.
3. Which **core entity**? Assign that insert tab (or Layout / CTAs / Resources).
4. Catalogue strip → `rowSectionFields` + title **`{Entity} row`**. Else job title — no “Row”.
5. One-line “when to use” vs near-duplicates on the same entity.

**Same change must include**

1. Schema object — D35 + shared helpers + `groups: sectionFieldGroups()`.
2. `websiteSections` + entity `FAMILY` + `SECTION_ALLOW.*`.
3. Distinct icon + canonical Studio title + `SectionItemPreview`.
4. Payload fields tagged `SECTION_GROUPS.content` (chrome via `sectionHeaderFields()`).
5. Optional `{_type}.webp` + `SECTION_PREVIEW_TYPES`.
6. GROQ + map + registry / `SectionRenderer` (token resolve via host ctx when page-scoped).
7. §8 document default / override when a page-level list already exists.
8. Human-only seed note — agents do not write documents.

## Beauty band → Section inventory (canonical)

Prove the playbook on `/solutions/beauty-cosmetics` first; other solutions later.

| Order | Today (React) | CMS `_type` | Work package |
| ----- | ------------- | ----------- | ------------ |
| — | `SolutionHero` | Route fields on `solution` (not a Section) | Shell only |
| 1 | `LogoMarquee` | `logoWall` | Wired (WP2) |
| 2 | `SolutionInspirations` | **`inspirationsGrid`** — mixed ref + typed; UI `InspirationGallery` | Wired (WP3) |
| 3 | `TextWithImage` (customizations) | `mediaFeature` | Wired (WP2) |
| 4 | `SolutionExpertise` / `StagesBoard` | `expertiseSequence`; UI `ExpertiseRow` | Wired (WP2) |
| 5 | `CaseStudiesRow` | `caseStudiesRow` | Wired (WP2) |
| 6 | `VideoCaseStudiesRow` | **`videoCaseStudiesRow`** | Wired (WP3) |
| 7 | `TestimonialsRow` | **`testimonialsRow`** (Layout · chrome CMS; quotes from live Google Places — PROD-2587) | Wired |
| 8 | `FaqSection` | `faqSection` | Wired (WP2) |
## Expertise stage band → Section inventory (PROD-2577)

Second proof of the playbook: `/expertise/[slug]`, starting with Strategy (Consultative archetype). The breadcrumb and hero are route-owned fields on `expertiseStage`. The body is `expertiseStage.sections[]`, with no template singleton, because archetypes order their bodies differently. How-built: [`apps/www/docs/expertise-stage-page.md`](../../apps/www/docs/expertise-stage-page.md).

| Order | Band (archetype spine) | CMS `_type` | Notes |
| ----- | ---------------------- | ----------- | ----- |
| — | Hero | Route fields on `expertiseStage` (`tagline`, `h1`, `description`, `diagram`, `heroCtaLabel`) | Not a Section |
| 1 | Why it matters + Signature System | **`signatureSystem`** (new, Expertise tab) | Why-it-matters problems and the named method in **one** Section: each problem opens the dimension that answers it, so splitting them would let a reorder or delete break the link. Dimensions = `expertiseService` refs; §8 inherit from `expertiseStage.services` (new `expertiseService.points[]`) |
| 2 | How an engagement starts | `mediaFeature` | Reuse |
| 3 | What you walk away with | **`benefits`** (new, Layout tab) | Outcome statements. `symbol` is a closed vocabulary of what the benefit is *about*; www picks the icon |
| 4 | Why it's certain | `caseStudiesRow` | §8 inherit: `featuredStudies`, else tagged case studies |
| 5 | Where this fits | `expertiseSequence` | Host override: stage path with current stage (see below) |
| 6 | FAQ | `faqSection` | §8 inherit from `expertiseStage.faqs`; FAQPage JSON-LD from rendered FAQs |
| 7 | Final CTA | `quoteCta` | Now wired in www (`body`, `ctaLabel` projected) |

**Host overrides.** `SectionRenderer` accepts `components` (by `_type`) so a host can render a Section with page context the page-agnostic registry cannot know. The data stays the same and the CMS stores no variant, so D35 is untouched. It is used by the expertise stage page for `expertiseSequence`. Use it sparingly: a second presentation of one Section on one host. It is not a way to fork a registry entry.

## Component → Section checklist (reviewers)

1. Passes the **route gate** (not chrome / not URL skeleton / not presentation-only).
2. Schema is **D35** — no theme/columns/band styling; shared chrome via `sectionHeaderFields()` is allowed (eyebrow · heading · intro · align · paddingBlock · link(+label) · dieline borders).
3. **Allowlist** + **entity insert tab** updated (`SECTION_ALLOW` + `FAMILY`).
4. Studio **title** follows §10 (entity row / job name); distinct icon; no casual `_type` rename.
5. Prefer **existing `_type`**; else new type with one job.
6. Merchandising partial coverage? → **mixed** ref \| typed (with migrate-to-ref rule).
7. Curated list also on the document? → **§8** document default + optional section override (no duplicate `min`; merge inherit wired).
8. React is **props-only** under `sections/` / `ui/`; no cross-feature imports.
9. Blog `pageBuilder` untouched.

## Consequences

- Later Solution LP work packages share one inventory and naming lock — no competing `_type` guesses.
- `inspirationsGrid`, `videoCaseStudiesRow`, and `testimonialsRow` are wired (schema + GROQ + renderer); Reviews quotes come from live Google Places (PROD-2587), not a shared `testimonial` document.
- Insert menu is entity-tabbed (Solutions · Case studies · Products · …) with Row/job Studio titles and optional thumbnails.
- Reviewers reject PRs that encode presentation in CMS, skip the allowlist/entity tab, force catalogue rows into the wrong Section type, require curated lists on both document **and** section, or casually rename `_type` / React outside the locked list.
- New curated bands default to **§8** (document default + section override) when a page-level list already exists.
- If Eric does not ratify, keep using the route gate in `apps/www/CLAUDE.md` as practice and revise this ADR rather than forking a second playbook.

## Out of scope

- Seeds and Beauty cutover (WP4 / WP5).
- Making `SolutionHero` a reorderable Section.
- Converting all solutions or the home page in the same change.
- Blog block rename / ADR-012 dataset migration.
- Shared `testimonial` document + curated Reviews items (chrome-only `testimonialsRow` is already in Layout).
