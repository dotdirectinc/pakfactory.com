# PROD-3211 — port notes for the configurator POC

What shipped on `feat/PROD-3211-configurator-card-highlights` (www rebuild) so you can mirror it in the POC. Schema/GROQ for `highlights` already landed separately (PR #969). This branch is **www + SpecTable UI** only.

## 1. Option list cards prefer `highlights`

**Intent:** Middle-panel option cards show authored highlight fragments (`a · b · c`). Fall back to `shortDescription`. Never use the long/glossary `description` on the list card (that stays on the detail pane).

| Step | Where (this repo) | What to do in the POC |
| --- | --- | --- |
| Type | `apps/www/src/lib/catalog/types.ts` → `CustomizationOption.highlights?` | Add optional `highlights?: string` on the catalog option type |
| Map | `apps/www/src/lib/catalog/map-sanity.ts` | `const highlights = option.highlights?.trim() \|\| ''` then spread `...(highlights ? {highlights} : {})` |
| Builder type | `apps/www/src/lib/customization-builder/types.ts` | `BuilderOption.highlights?`; include `'highlights'` in `CatalogOptionLike` |
| Seed steps | `apps/www/src/lib/customization-builder/state.ts` `buildStepsFromCatalog` | Pass through trimmed highlights onto each builder option |
| Blurb helper | `apps/www/src/lib/customization-builder/option-card-blurb.ts` | `return highlights?.trim() \|\| shortDescription?.trim() \|\| ''` |
| List UI | `apps/www/src/components/customization-builder/category-type-list.tsx` | Use `optionCardBlurb(option)` for the card subtitle; include `highlights` in search haystack |
| Tests | `apps/www/src/lib/customization-builder/option-highlights.test.ts` | Prefer / fall back / empty cases |

Detail pane copy is unchanged — still `shortDescription` / description as before.

## 2. SpecTable: “Need consultation” as a real chip; hide facts until a flute pick

**Intent:** Builder properties that use SpecTable (e.g. Flute Grade) already seed `__consultation__` via `initialConsultationPropertySelection`. The **label** showed “Need consultation”; the control did not (consultation was filtered out of segments), so no chip looked selected and the facts table painted dashes.

| Step | Where | What to do |
| --- | --- | --- |
| Stop filtering | `option-property-controllers.tsx` `case 'specTable'` | Pass full `displayOptions` into `SpecTableFromOptions` (do **not** strip `PROPERTY_CONSULTATION_ID`) |
| Segments vs rows | `SpecTableFromOptions` | `segments` from **all** options (incl. consultation). Build `columns` / `rows` only from `factOptions` (skip consultation id) |
| Hide empty table | `packages/ui/.../spec-table-field.tsx` | Treat missing `rows[seg]` as “no table” (`hasOwnProperty` / undefined) — render chips only, no dashes |
| Leave seed alone | `initialConsultationPropertySelection` | Still `[PROPERTY_CONSULTATION_ID]` per property when `consultationDefault` |

CDP / non-builder (`consultationDefault={false}`) never injects consultation, so SpecTable stays flute-only there.

```text
Open Kraft → Need consultation selected → chips only, no Thickness/Flutes table
Pick B/F-Flute → that chip selected → facts table with real values
Pick Need consultation again → table hidden
```

Sentinel id: `__consultation__` (`PROPERTY_CONSULTATION_ID`).

## 3. SpecTable chips: wrap instead of equal-width tabs

**Intent:** Equal-width `flex-1` tabs do not scale past ~5 labels. Match ChipField layout behavior (hug content + wrap), keep SpecTable filled `chipClass` chrome.

In `spec-table-field.tsx` segment row:

- Container: `flex flex-wrap gap-2` (keep `mb-4` only when the facts table is shown)
- Buttons: drop `flex-1` / `min-w-0` / stretch; use `inline-flex items-center` + `chipClass`
- Keep `role="tablist"` / `tab` / `aria-selected`

## Files touched (this PR)

- `apps/www/src/lib/catalog/types.ts`
- `apps/www/src/lib/catalog/map-sanity.ts`
- `apps/www/src/lib/customization-builder/types.ts`
- `apps/www/src/lib/customization-builder/state.ts`
- `apps/www/src/lib/customization-builder/option-card-blurb.ts` (new)
- `apps/www/src/lib/customization-builder/option-highlights.test.ts` (new)
- `apps/www/src/components/customization-builder/category-type-list.tsx`
- `apps/www/src/components/customization/option-property-controllers.tsx`
- `packages/ui/src/components/customization/property-controller/spec-table-field.tsx`

## Out of scope / already elsewhere

- Sanity schema + GROQ for `customizationOption.highlights` (PR #969)
- Changing ChipField / radioPick chrome
- Authoring highlight content in the dataset (humans / Studio)
