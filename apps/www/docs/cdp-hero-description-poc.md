# CDP hero description — port notes for the POC (PROD-3207)

Why Studio can show a filled **Description** while the CDP hero under the H1 was empty — and how the rebuild fixes it.

Example: `/customizations/finishing/aq-coating-aqueous`

This is **not** PROD-3211 (configurator list-card highlights). Different field, different surface.

## Field split (after PROD-3207 www switch)

| Studio / mapped field | Used for |
| --- | --- |
| `customizationOption.description` (Portable Text) | **CDP hero** under the H1 → www `descriptionBlocks` |
| `customizationOption.body` (Portable Text) | Long-form under the hero; omit when empty |
| `alsoKnownAs` / `inheritAliasesFromConcept` / concept aliases | “Also known as” line — branch on the checkbox only |
| `glossaryPlain` / `glossaryDefinition` | SEO / tokens / transitional — **not** the hero |
| `shortDescription` | Cards / compare blurb — **never** the CDP hero |
| `highlights` | Configurator list cards (PROD-3211) |

```text
Studio option
  ├─ Description (PT)  → CDP hero
  ├─ Body (PT)         → CDP long-form (optional)
  ├─ alsoKnownAs       → alias line (checkbox off)
  ├─ glossary plain    → SEO / %description% tokens
  └─ shortDescription / highlights → cards / builder
```

## What broke

PROD-3206 moved “what it is” onto the option’s own `description`. GROQ already projects it. www still rendered `glossaryDefinition` (PROD-2779). After PROD-3209 cleared/repointed glossary mirrors, every hero on the `development` dataset (staging) went blank while Studio Description stayed full.

## Rebuild fix (mirror on the POC)

1. Map option `description` PT → `descriptionBlocks` (or equivalent).
2. Keep string `description` / SEO path from `glossaryPlain` only.
3. Hero under H1: PortableText of `descriptionBlocks`. No glossary hero. No `shortDescription` fallback.
4. Optional: render `body` with `bodyImage`; alias line via checkbox (never “fall back if empty”).
5. Compare intro: replace legacy literal `{type}` with type title / category noun (Achieves template).

Key files on rebuild:

- [`map-sanity.ts`](../src/lib/catalog/map-sanity.ts) — `mapSanityCustomizationDetail`
- [`customization-option-hero-copy.tsx`](../src/components/customization/customization-option-hero-copy.tsx)
- [`customization-overview.tsx`](../src/components/customization/customization-overview.tsx)
- [`option-aliases.ts`](../src/lib/catalog/option-aliases.ts)
- [`reference-copy.ts`](../src/lib/catalog/reference-copy.ts) — `resolveCompareIntroPlaceholder`

## Verify

- AQ Coating CDP: paragraph under H1 matches Studio Description.
- Option with empty Description: no hero paragraph (do not invent from shortDescription).
- Alias line only when the checkbox-selected list has entries.
- Configurator list cards unchanged.
