# Bug: Inspiration presets could not pre-select derived (Finishing / Printing) options

**Status:** Fixed — #744 into `www-new-release` (2026-10-02); staging Studio redeployed
**Jira:** PROD-2776 · **Vault record:** BUG-0044
**Symptom:** On an Inspiration product, *Available customizations* offered 54 options, while the
base product's **Customization** tab listed 55 more — every Finishing and Printing option. None of
those could be pre-selected.

## What happened

A preset *offers* what its `basedOn` product offers and *stores* only its pre-selections (D61).
The picker (`apps/studio/components/AvailableCustomizationsInput.tsx`) worked out "what the base
offers" by reading the base's **stored** `availableCustomizations`.

Since D69 / PROD-2595 that stored field holds the **direct** half only. Derived options (most of
Finishing, all of Printing) are computed by `@pakfactory/sanity/customization-rules`
(`resolveForProduct`) and never stored. So the picker saw only the direct half, and its universe
query also filtered to `availabilityDecidedBy == "product"` Types.

The Customization tab (`ProductDerivedCustomizations.tsx`) already showed the full computed answer,
so the two views of one product disagreed. The stray-option validation in `schemas/product.ts` had
the same gap.

## Fix

- `apps/studio/lib/product-availability.ts`: one helper (catalog query + `resolveForProduct`),
  used by the Customization tab, the picker and the validation.
- On a preset, the picker scopes to the base's **resolved** set (direct + derived + exceptions).
  Standard products are unchanged.
- The "not offered by the base" warning resolves the same set.

Verified on the development dataset: the reported preset went from **54 → 109** pickable options,
matching the base's Customization tab. www already applies a preset's `preselectedIds` across the
resolved set, so no front-end change was needed. Not yet exercised end to end on a www product
page.

## Root cause & prevention (the reusable lesson)

**When a stored field becomes one half of a computed answer, check every reader that used it as
the whole.** D69 kept the field's meaning precise ("what this product offers directly"), but the
preset picker had been using it as a proxy for "everything the base offers".

- Answer "what does product X offer?" through `lib/product-availability.ts`. Don't write another
  query for it.
- When narrowing a field's scope, grep its readers and ask of each: half, or whole?
