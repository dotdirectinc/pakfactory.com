# ADR-016: `@sanity/presets` — evaluated, not adopted as the base

**Status:** Accepted (2026-08-18). Records the evaluation the Foundations task (PROD-2286) was asked to make before hand-rolling shared schema patterns.

## Context

`Conventions.md` §2.6 and the Foundations ticket both require: *"Sanity ships `@sanity/presets` — ready-made schema types for SEO metadata, links, images, pages and rich text… look before writing the boilerplate and say what you found."* Four of the shared patterns Foundations builds overlap with what the package offers.

**What was evaluated:** `@sanity/presets` **1.0.6** (latest), described as "Production ready preset patterns for Sanity Studio". Peer deps `sanity: ^5 || ^6`, `react: ^19.2` — compatible with our studio (`sanity ^5.24`).

## Decision

**Do not adopt `@sanity/presets` as the base for the shared platform patterns.** Keep the hand-rolled, PakFactory-specific definitions already in `apps/studio/lib/`.

### Why, per pattern

| Preset area | Our implementation | Why ours stays |
| ----------- | ------------------ | -------------- |
| **SEO metadata** | `lib/seo-fields.ts` (`seoFields` / `socialFields`) | Encodes contracts a generic preset can't: robots-toggle defaults resolved **from each type's settings singleton** at create time (`newDocDefault`), media-tagged OG images, length-warning validation, and blank-field fallbacks resolved in the GROQ layer. Field names match the deployed `blogTag` convention — adopting a preset would rename/nest fields and **force a migration across 174 posts** for no editorial gain (§2.4 forbids exactly this). |
| **Links** | `lib/link-target-fields.ts` + `linkable-document-types.ts` | Internal links resolve through our `resolve-document-href` map and a GROQ picker filter tied to specific routable types. A generic link preset knows none of that wiring. |
| **Images** | `lib/media-tags.ts` (`taggedImageField`) | Carries media-library tags per channel and enforced `alt` — §2.3. |
| **Pages / rich text** | Blog `body*` blocks + the new sections framework | Rich text uses the deployed `body*` prefix convention (§2.3); pages compose via `lib/sections.ts`. A preset would diverge from both. |

### The general reason

The package is **experimental despite the "production ready" label**, and the ticket is explicit: *don't build the platform on it.* More decisively, our shared sets are not boilerplate — they encode PakFactory contracts (settings-singleton fallbacks, href resolver, media tags, GROQ filters) that a generic preset would strip, at the cost of a dataset migration §2.4 rules out.

## Consequences

- Foundations hand-rolls the shared patterns in `apps/studio/lib/`, as it already began.
- **Noted for future greenfield leaf fields** with no existing contract (e.g. a plain image or a one-off rich-text field), a preset may be the cheaper choice — evaluate per case, not as the platform base.
- Revisit if `@sanity/presets` reaches a stable (non-experimental) release and our contracts can be expressed through its extension points.
