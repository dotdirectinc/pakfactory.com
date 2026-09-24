# Expertise stage page (PROD-2577)

How `/expertise/[slug]` is wired, for humans and AI agents. This is the **one template** every expertise stage renders through (PROD-1108 / PROD-2469). Strategy (PROD-2577) is the first stage to use it; Design (PROD-2578), Prototyping, Manufacturing, Logistics and Fulfillment reuse it with their own content. Section rules live in [ADR-020](../../../docs/adr/0020-component-to-section-playbook.md). This file only covers how the page is built in www.

## Shape

| Part | Owner | Source |
| --- | --- | --- |
| Breadcrumb | Route | Home → Expertise → stage title |
| Hero | Route (ADR-020 §2) | `expertiseStage.tagline` (eyebrow), `h1` (falls back to `title`), `description` (subhead), `diagram` (media), `heroCtaLabel` (button to the quote request, `WWW_ROUTES.request`; empty falls back to "Get a quote") |
| Body | Editors | `expertiseStage.sections[]` (`SECTION_ALLOW.marketPage`), rendered in editor order by `SectionRenderer` |
| SEO | Route | `metaTitle` / `metaDescription` / robots / canonical; OG image comes from `ogImage`, then `diagram`, then Global Settings `defaultOgImage` |
| JSON-LD | Route | BreadcrumbList, plus FAQPage built from the FAQ sections the page actually renders ([`expertise-jsonld.ts`](../src/lib/expertise/expertise-jsonld.ts)) |

There is no per-stage layout and no template singleton. Stages differ by archetype (Consultative, Experiential, Operational), so each stage's `sections[]` holds its full body.

## Band → Section map (Strategy, Consultative)

| # | Band (archetype spine) | `_type` | React |
| --- | --- | --- | --- |
| 1 | Why strategy matters + Our approach (360° Strategic Framework) | `signatureSystem` (new) | `SignatureSystem` + `ui/SystemRing` |
| 2 | How an engagement starts | `mediaFeature` | `TextWithImage` |
| 3 | What you walk away with | `benefits` (new) | `Benefits` |
| 4 | Why it's certain (Strategic clarity) | `caseStudiesRow` | `CaseStudiesRow` |
| 5 | Where this fits | `expertiseSequence` | `ExpertiseLifecycle` → `ui/StagePath` (this host only) |
| 6 | FAQ | `faqSection` | `FaqSection` |
| 7 | Final CTA | `quoteCta` (now wired) | `QuoteCta` |
| — | Trust strip (optional) | `logoWall` | `LogoWall` |

## Host inherit (ADR-020 §8)

An empty section list is filled from the stage document, unless the editor picked **Custom**:

| Section | Inherits | Helper |
| --- | --- | --- |
| `signatureSystem.services` | `expertiseStage.services` (non-discontinued), in order | [`inherit-signature-system.ts`](../src/lib/sections/inherit-signature-system.ts) |
| `faqSection.faqs` | `expertiseStage.faqs` | `applyFaqInherit` |
| `caseStudiesRow.items` | `featuredStudies`; if that is empty, the 6 latest case studies tagging the stage (`expertiseAreas`) | `applyCaseStudyInherit` |
| `expertiseSequence.stages` | Every stage in hub order: `expertisePage.featured` pins first, then by title (ADR-017, `orderExpertiseStages`) | [`lifecycle.ts`](../src/lib/expertise/lifecycle.ts) `applyStageSequenceInherit` |

Page-field tokens (`%h1%`, `%title%`, `%slug%`, …) resolve from the stage.

**Stage order is not a field on `expertiseStage`.** It was removed on 2026-09-01 (ADR-017). Fill `expertisePage.featured` in Studio. Until that document exists, the lifecycle falls back to title order.

## One Section, two hosts

`SectionRenderer` takes an optional `components` override, keyed by `_type`. On a stage page, `expertiseSequence` renders as the lifecycle path:
- every stage is shown, and the current one is highlighted with `aria-current="step"`;
- unreleased (`coming-soon`) stages are not linked;
- previous and next links skip unreleased stages.

Everywhere else the same Section still renders as `ExpertiseRow` (StagesBoard). The CMS stores no variant field (D35).

## Signature system behaviour

- Each problem label can reference the Expertise Service that answers it. Selecting the label opens that dimension, writes `#<dimension>` to the URL and scrolls to it once the accordion settles.
- A problem whose service is not among the shown dimensions renders as a plain label.
- The anchor is the service `slug` when it has one, otherwise the slugified title (e.g. `#value-engineering`). A deep link opens that dimension on load.
- The ring is decorative (`aria-hidden`). The disclosure list is the control, and the caption repeats the open dimension as text.

## Content

Strategy content is seeded by [`seed-expertise-strategy.mjs`](../../studio/scripts/seed-expertise-strategy.mjs), which a human runs (`pnpm --filter @pakfactory/studio run seed:expertise-strategy -- --dataset development [--confirm]`). Editors still add these in Studio:
- the engagement photo (`mediaFeature` renders nothing without media)
- the stage diagram
- the OG image
- the logo wall

## Files

| Layer | Location |
| --- | --- |
| Route | [`src/app/(site)/expertise/[slug]/page.tsx`](../src/app/(site)/expertise/[slug]/page.tsx) |
| View | [`src/components/expertise/expertise-views.tsx`](../src/components/expertise/expertise-views.tsx) `ExpertiseStageView` |
| GROQ | [`packages/sanity/src/queries/expertise.ts`](../../../packages/sanity/src/queries/expertise.ts) `EXPERTISE_STAGE_BY_SLUG_QUERY`; section shapes in `queries/sections.ts` |
| Mapping | [`src/lib/expertise/map-sanity.ts`](../src/lib/expertise/map-sanity.ts), `lib/sections/map-signature-system.ts`, `map-benefits.ts`, `map-quote-cta.ts` |
| Tests | [`src/lib/expertise/expertise-stage-sections.test.ts`](../src/lib/expertise/expertise-stage-sections.test.ts) |
