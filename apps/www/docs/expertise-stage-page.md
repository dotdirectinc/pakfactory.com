# Expertise stage page (PROD-2577)

How `/expertise/[slug]` is wired, for humans and AI agents. This is the **one template** every expertise stage renders through (PROD-1108 / PROD-2469). Strategy (PROD-2577) is the first stage to use it; Design (PROD-2578), Prototyping, Manufacturing, Logistics and Fulfillment reuse it with their own content. Section rules live in [ADR-020](../../../docs/adr/0020-component-to-section-playbook.md). This file only covers how the page is built in www.

## Shape

| Part | Owner | Source |
| --- | --- | --- |
| Breadcrumb | Route | Home → Expertise → stage title |
| Hero | Route (ADR-020 §2) | `expertiseStage.tagline` (eyebrow), `h1` (falls back to `title`), `description` (subhead), `diagram` (media), `heroCtaLabel` (button to the quote request, `WWW_ROUTES.request`; empty falls back to "Get a quote") |
| Body | Editors | The stage's **Expertise Stage Page template** (`expertiseStage.template` → `expertiseStagePage`, Main Website → Expertise Pages → Expertise Stage Pages): its `sections[]` (`SECTION_ALLOW.marketPage`), rendered in editor order by `SectionRenderer`. Legacy `expertiseStage.sections` is read as a fallback until `migrate-expertise-stage-template` has run |
| SEO | Route | `metaTitle` / `metaDescription` / robots / canonical; OG image comes from `ogImage`, then `diagram`, then Global Settings `defaultOgImage` |
| JSON-LD | Route | BreadcrumbList, plus FAQPage built from the FAQ sections the page actually renders ([`expertise-jsonld.ts`](../src/lib/expertise/expertise-jsonld.ts)) |

There is no per-stage layout in code. The body lives on an **Expertise Stage Page** template document, and unlike the Solution / Product Line singletons it owns the whole body: order, headings and band content. Stages differ by archetype (Consultative, Experiential, Operational), so templates are per archetype or per stage: **Packaging Strategy** and **Packaging Design** today. Lists the template leaves empty still fill from the stage that renders it (see Host inherit below), and page-field chips resolve from that stage, so one template can serve several stages. Editing a template revalidates every stage page (`/api/revalidate` handles `expertiseStagePage`).

## Band → Section map (Strategy, Consultative)

| # | Band (archetype spine) | `_type` | React |
| --- | --- | --- | --- |
| 0 | Trust strip ("Trusted by 5,000+ brands…") | `logoWall` | `LogoWall` |
| 1 | Why strategy matters + Our approach (360° Strategic Framework) | `signatureSystem` (new) | `SignatureSystem` + `ui/SystemRing` |
| 2 | How an engagement starts | `mediaFeature` | `TextWithImage` |
| 3 | What you walk away with | `benefits` (new) | `Benefits` |
| 4 | Why it's certain (Strategic clarity) | `caseStudiesRow` | `CaseStudiesRow` |
| 5 | Where this fits | `expertiseSequence` | `ExpertiseLifecycle` → `ui/StagePath` (this host only) |
| 6 | FAQ | `faqSection` | `FaqSection` |
| 7 | Final CTA | `quoteCta` (now wired) | `QuoteCta` |

## Band → Section map (Design, Experiential — PROD-2578)

Show first, then explain. The template is the same; only the stage's `sections[]` differs.

| # | Band (archetype spine) | `_type` | React |
| --- | --- | --- | --- |
| 0 | Trust strip | `logoWall` | `LogoWall` |
| 1 | Work showcase ("Our work") | `inspirationsGrid`: a Custom list of typed cards reusing case-study images, each linking to its study (to be swapped for the design team's curated set) | `InspirationGallery` |
| 2 | What's possible ("What our designers do") | `signatureSystem` with **no System name** | `SignatureSystem`: the services list, with the open service's image beside it instead of the ring |
| 3 | How it works | `steps` (now wired; each step can link on, e.g. to the Prototyping stage) | `Steps` |
| 4 | Why it's certain (Design fidelity) | `caseStudiesRow` | `CaseStudiesRow` |
| 5–7 | Where this fits · FAQ · Final CTA | `expertiseSequence` · `faqSection` · `quoteCta` | as Strategy |

Service images are a new optional field, `expertiseService.image`.

## Host inherit (ADR-020 §8)

An empty section list is filled from the stage document, unless the editor picked **Custom**:

| Section | Inherits | Helper |
| --- | --- | --- |
| `signatureSystem.services` | `expertiseStage.services` (non-discontinued), in order | [`inherit-signature-system.ts`](../src/lib/sections/inherit-signature-system.ts) |
| `faqSection.faqs` | `expertiseStage.faqs` | `applyFaqInherit` |
| `caseStudiesRow.items` | `featuredStudies`; if that is empty, the 6 latest case studies tagging the stage (`expertise`, or `expertiseAreas` before the PROD-2293 rename) | `applyCaseStudyInherit` |
| `expertiseSequence.stages` | Every stage in hub order: `expertisePage.featured` pins first, then by title (ADR-017, `orderExpertiseStages`) | [`lifecycle.ts`](../src/lib/expertise/lifecycle.ts) `applyStageSequenceInherit` |

Page-field tokens (`%h1%`, `%title%`, `%slug%`, …) resolve from the stage.

**Stage order is not a field on `expertiseStage`.** It was removed on 2026-09-01 (ADR-017). Fill `expertisePage.featured` in Studio. Until that document exists, the lifecycle falls back to title order.

## One Section, two hosts

`SectionRenderer` takes an optional `components` override, keyed by `_type`. The expertise stage page uses it to give shared Sections the expertise (POC) presentation. The data is the same and the CMS stores no variant field (D35); every other host keeps the registry default.

| `_type` | On the stage page | Elsewhere |
| --- | --- | --- |
| `expertiseSequence` | `ExpertiseLifecycle` → `ui/StagePath`: every stage, the current one highlighted (`aria-current="step"`); `coming-soon` stages are not linked; previous/next links skip them | `ExpertiseRow` (StagesBoard) |
| `mediaFeature` | `ui/MediaPanel`: one rounded panel with the copy over the image. Renders solid until an image is uploaded | `TextWithImage` |
| `caseStudiesRow` | `CaseStudiesRow` on the muted band | `CaseStudiesRow` (default band) |
| `quoteCta` | `QuoteCta` with `theme="inverse"` (dark band), left-aligned | `QuoteCta` (muted, centred) |

Band rhythm follows the POC:
- `signatureSystem` (the "why" on white, the method on muted)
- `steps` (muted)
- case studies (muted)
- the dark closing CTA

The hero's diagram renders as a full-width media band under the copy.

## Signature system behaviour

Presentation follows the data, not a layout field:
- **Named method** (System name set, e.g. Strategy's 360° Strategic Framework): a disclosure list plus a decorative ring numbered per dimension, with the name's leading figure ("360°") set large.
- **No named method** (Design): dark service cards (the service image when set) with a `+` that reveals the summary.


- Each problem label can reference the Expertise Service that answers it. Selecting the label opens that dimension, writes `#<dimension>` to the URL and scrolls to it once the accordion settles.
- A problem whose service is not among the shown dimensions renders as a plain label.
- The anchor is the service `slug` when it has one, otherwise the slugified title (e.g. `#value-engineering`). A deep link opens that dimension on load.
- The ring is decorative (`aria-hidden`). The disclosure list is the control, and the caption repeats the open dimension as text.

## Content

Stage content is seeded by a human-run script per stage: [`seed-expertise-strategy.mjs`](../../studio/scripts/seed-expertise-strategy.mjs) and [`seed-expertise-design.mjs`](../../studio/scripts/seed-expertise-design.mjs) (`pnpm --filter @pakfactory/studio run seed:expertise-<stage> -- --dataset development [--confirm]`). Both run through the shared runner [`lib/expertise-stage-seed.mjs`](../../studio/scripts/lib/expertise-stage-seed.mjs); a new stage adds only a content file. For Design, editors also curate the work gallery cards and add service images. Editors still add these in Studio:
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
| Mapping | [`src/lib/expertise/map-sanity.ts`](../src/lib/expertise/map-sanity.ts), `lib/sections/map-signature-system.ts`, `map-benefits.ts`, `map-quote-cta.ts`, `map-steps.ts` |
| Tests | [`src/lib/expertise/expertise-stage-sections.test.ts`](../src/lib/expertise/expertise-stage-sections.test.ts) |
