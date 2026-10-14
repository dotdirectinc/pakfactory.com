# Studio handoff — property relationships (Controller Lab + Printable Sides)

Partner brief for work that shipped off `chore/property-controllers` → `www-new-release`:

| PR | Merged | What |
| --- | --- | --- |
| [#840](https://github.com/dotdirectinc/pakfactory.com/pull/840) | 2026-10-09 | Studio `declaredProperty.control` + `valuesPerItem`, Controller Lab seed, backfill migration (§1 below) |
| [#841](https://github.com/dotdirectinc/pakfactory.com/pull/841) | 2026-10-12 | Printable Sides printing gate and the www wiring (§2 below) |

This documents what changed in **Sanity Studio / content model relationships** and how editors should use them. Www wiring is summarized only where it affects Studio authoring.

---

## 1. Customization Type ↔ Property (Customer control)

### Relationship (unchanged shape, new fields)

```
customizationType
  └─ properties[] (declaredProperty)
        ├─ property → property (taxonomy)
        ├─ usage: stated | selectable
        ├─ showOnDetailPage (stated only)
        ├─ control          ← NEW (selectable only)
        └─ valuesPerItem    ← NEW (selectable + chip/list/toggles)
```

- **Stated** = option states a fact (spec / filter). No customer control.
- **Selectable** = buyer picks a value in the configurator. Studio now says **which control** and **one vs several**.

Schema: [`apps/studio/schemas/customizationType.ts`](../schemas/customizationType.ts) (`declaredProperty`).

### New editor fields (Selectable rows only)

| Field | Title | Values |
| --- | --- | --- |
| `control` | Customer control | See **Customer control values** below |
| `valuesPerItem` | Customer may select | One value / Several values — only for **Chips**, **List**, **Toggles** |

Defaults for new rows: `control: chip`, `valuesPerItem: one`. Preview subtitle for selectable rows: `Selectable · Chips`.

The **same Property** can use a different control on another Type.

### Customer control values

Studio dropdown title → stored `control` slug. Www renders these on the option Configuration rail / builder detail.

| Studio label | `control` value | What the buyer sees | Authoring notes |
| --- | --- | --- | --- |
| **Chips** | `chip` | Pill buttons for each Property Value. Check mark on the selected chip. | Supports **Customer may select**: one or several. Common for finishes / simple catalogs. |
| **Swatch** | `swatch` | Color/image swatches in a grid; selected state with top-right check. | Values should have color and/or image. “Custom color” appearance can open a follow-up custom-color panel. |
| **Swatch with shades** | `swatchShades` | Two-tier: pick a main swatch, then a shade under it (`kindOf` parent → children). | Author parent values + shade children linked via `kindOf`. Not a flat swatch list. |
| **Radio** | `radio` | Vertical radio list; selected row shows a white ring + primary center dot. | Single choice only. |
| **Radio with pick** | `radioPick` | Radio that reveals a follow-up: **Stock** → pick list; **Custom** → dimension-style inputs. | Choice titles should contain “Stock” / “Custom” (www matches those substrings). |
| **List** | `listbox` | Dropdown (single) or multi-select menu with checks. | Supports **Customer may select**: one or several. |
| **Cards** | `card` | Image cards in a grid with selection check. | Prefer values with images (`imageUrl`). |
| **Toggles** | `toggles` | One No\|Yes segmented control **per Property Value** (e.g. Foil / Emboss / Spot UV). | Supports **Customer may select**: one or several (several = multiple Yes at once). **Not** the product Printable Sides printing gate. |
| **Read-only** | `readonly` | Displays a fixed value; buyer cannot change it. | Use when the option already implies the value and you only need to show it. |
| **Spec table** | `specTable` | Spec-style segments built from value **facts** (label/value rows). | Author facts on Property Values; not a free-form picker. |
| **Pantone** | `pantone` | Pantone count stepper + PMS code entries (Spot / Hybrid flows). | Does not require a long list of Property Values; www drives count/codes from the control itself. |
| **Dimensions** | `dimension` | Axis inputs (L/W/H etc.) with unit and optional “unsure”. | Driven by product `dimensionInput` / range more than by Property Values. |

**`valuesPerItem` (Customer may select)** — only appears when `control` is `chip`, `listbox`, or `toggles`:

| Value | Meaning |
| --- | --- |
| `one` | Buyer may select a single value (or a single toggle Yes under exclusivity rules). |
| `many` | Buyer may select several values at once. |

### What www does with it

Option detail / builder Configuration rail reads `declaredProperty.control` + authored Property Values and renders the matching UI. No second place in Studio to pick the control per option.

### Human ops (agents do not write documents)

**Optional backfill** for existing selectable rows that have no `control` yet:

```bash
pnpm --filter @pakfactory/sanity migrate:declared-property-control -- --dataset development
pnpm --filter @pakfactory/sanity migrate:declared-property-control -- --dataset development --confirm
```

Heuristic: swatch-looking values → `swatch` / `one`; else `chip` / `one`.

**QA seed** (Materials Controller Lab — `[TEST]` titles; fixed ids only):

```bash
pnpm --filter @pakfactory/studio run seed:controller-lab -- --dataset development
pnpm --filter @pakfactory/studio run seed:controller-lab -- --dataset development --confirm
```

Gold path on www: test product Materials → **[TEST] Controller Lab — Alpha**.

---

## 2. Product ↔ Printable Sides → Printing gate

### Relationship (no new Studio schema)

```
property "Printable Sides" (slug: printable-sides)
  └─ propertyValue[] (Outside, Inside, Both Sides, Front/Back Panel, …)

productLine.properties[]  → must declare Printable Sides (picker scope)
product.properties[]
  └─ property → Printable Sides
  └─ values[] → one or more sides
```

Property / values already exist in the dataset. [#841](https://github.com/dotdirectinc/pakfactory.com/pull/841) **does not** add a new Studio field for printable sides. Www now **reads** the product’s stated values and builds the Printing step gate.

### What editors set

1. Ensure the **Product Line** lists **Printable Sides** in its declared properties.
2. On the **Product** → Properties: choose Printable Sides and pick the face(s).

### What the buyer sees (www)

| Product Printable Sides | Printing gate |
| --- | --- |
| 2+ values (e.g. Outside + Inside) | One No\|Yes per value — label `Print {title}` |
| Exactly 1 value (e.g. Outside, Both Sides) | One No\|Yes — label `Print {title}` |
| Missing / empty | No gate; methods treated as print-on |

Rail / RFQ summary uses the Yes answers (e.g. Outside only, Inside only, Both Outside & Inside, or the single side title).

This is **not** the Lab **Toggles** customer control (Foil / Emboss / Spot UV). Those are option Property Values with `control: toggles`. Printable Sides is a **product fact**.

---

## 3. What did *not* change in Studio

- No new document types for Printable Sides.
- No change to Property / Property Value schemas for this feature.
- Agents still must not seed/patch/publish Sanity documents (humans run seeds/migrations with explicit `--dataset`).
- Admin Property Controls UI parity is a separate handoff: [`apps/admin/docs/property-controls-www-parity.md`](../../admin/docs/property-controls-www-parity.md).

---

## 4. Quick verify for your partner

**Type ↔ control**

1. Open any Customization Type → Properties → set a row to **Selectable**.
2. Confirm **Customer control** appears; for Chips/List/Toggles confirm **Customer may select**.
3. On a product that offers that type’s options, open the builder / option detail and confirm the control matches.

**Printable Sides**

1. Open a product with Outside + Inside vs Outside-only vs no Printable Sides row.
2. On www, Customize → Printing: gate row count and labels should match the table above.

---

## 5. Code map (if they dig in)

| Concern | Path |
| --- | --- |
| Studio declaredProperty.control | `apps/studio/schemas/customizationType.ts` |
| Controller Lab seed | `apps/studio/scripts/seed-controller-lab.mjs` |
| Control backfill migration | `packages/sanity/scripts/migrate-declared-property-control.ts` |
| PDP property slugs (GROQ) | `packages/sanity/src/queries/catalog.ts` |
| Resolve printable sides | `apps/www/src/lib/customization-builder/printable-sides.ts` |
| Printing gate UI | `apps/www/src/components/customization-builder/printed-side-gate.tsx` |
