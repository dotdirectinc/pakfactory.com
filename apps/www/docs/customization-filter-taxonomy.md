# Customization catalog — filter taxonomy

> **www reference (checked in).** POC/Notion-derived vocabulary and filter operators.
> Live option lists still come from Sanity; **operators and product-line ids** are
> encoded in [`src/lib/catalog/customization-filter-taxonomy.ts`](../src/lib/catalog/customization-filter-taxonomy.ts).
> How-built wiring: [`customizations-catalog.md`](./customizations-catalog.md).

Reference for implementing the `/customizations` filter panel against real data.

Everything here is **generated from the Notion CSV exports**, not hand-authored:
`data/notion-export/*.csv` → `scripts/build-customizations.mjs` →
`src/shared/data/customizations.generated.js`. Regenerate with:

```bash
node scripts/build-customizations.mjs
```

Counts below are from the current export (316 live rows; rows with
`Status = "Remove"` are excluded at build time) and match what the POC renders.

---

## 1. Panel composition

The panel is assembled in three tiers, top to bottom:

| Tier | Group | Scope | Selection | Notes |
|---|---|---|---|---|
| 1 | **Product Line** | Global | Multi (OR) | Always visible, same 13 options everywhere |
| 2 | **Sustainability** | Global | Multi (AND) | Union of the per-category sustainability columns |
| 3 | *Category facets* | Per category | Multi (OR or AND) | Group set changes with the active category |
| 4 | **Type** | Per category | Single | The category's subtype vocabulary; `All` preselected |

**Category is not in the panel.** It sits in the top rail because it is
single-select and *decides which facet groups exist* — it is a scope switch, not
a filter that composes with the others. Search sits in the top rail beside it.

Counts shown next to each option are **contextual**: they reflect how many rows
that option would return given every *other* active filter. An option whose
contextual count is 0 is disabled rather than clickable, so the user cannot
navigate into an empty grid.

---

## 2. Filter logic

- **Within a group:** OR by default (`Rigid Boxes` OR `Folding Cartons`).
- **Across groups:** always AND.
- **Exception — AND within a group:** `Sustainability` and `Performance`. These
  are buyer requirements that stack ("must be FSC **and** recyclable"), and
  their source rows are multi-valued, so AND returns results.

⚠️ **The operator must follow the column's cardinality.** A facet whose source
column holds exactly one value per row can never satisfy AND across two
selections — it returns zero every time. `Coating`, `Fibre treatment`,
`Material source`, `Aesthetic`, `Coverage` and `Ink composition` are all
single-valued and must stay OR.

`Filter - Physical Properties` in `materials.csv` is **two independent axes in
one column**. Co-occurrence analysis shows `Coated`/`Uncoated` and
`Bleached`/`Unbleached`/`Dyed` never conflict, so the build splits them into two
facets. Do not present the raw column as a single group.

---

## 3. Product Line (global)

Derived from the `Applicable Product Types` column via a vocabulary bridge
(`PRODUCT_LINE_OF` in the build script) — the export's product-type strings do
not match the 13 canonical line names one-to-one.

| id | Label | All categories | Within Materials |
|---|---|---|---|
| `rigid-boxes` | Rigid Boxes | 77 | 20 |
| `folding-cartons` | Folding Cartons | 72 | 14 |
| `corrugated-boxes` | Corrugated Boxes | 62 | 7 |
| `cardboard-displays` | Cardboard Displays | 64 | 7 |
| `box-inserts` | Box Inserts | 114 | 52 |
| `retail-promotional-bags` | Retail & Promotional Bags | 54 | 22 |
| `fabric-gift-bags` | Fabric Gift Bags & Pouches | 16 | 14 |
| `mailer-bags` | Mailer Bags | 39 | 21 |
| `pouches` | Pouches | 27 | 8 |
| `tin-packaging` | Tin Packaging | 11 | 2 |
| `stickers` | Stickers | 44 | 15 |
| `packaging-labels` | Packaging Labels | 44 | 15 |
| `packaging-accessories` | Packaging Accessories & Inserts | 36 | 10 |

## 4. Sustainability (global)

`AND` within the group. Options are the union across all four exports.

`Compostable` · `FSC® available` · `Recyclable` · `Recycled Content`

Source columns differ per export — see each category below.

---

## 5. Materials — 129 rows

**Type** (single-select, from `Material Type`) — 13 options, 100% tagged:

Blister Plastic (8) · Chipboards (8) · Corrugated Board (7) · Exterior Wrap (12) ·
Fabric (19) · Foam (9) · Mailer Film (8) · Molded Pulp (5) · Paperboard (14) ·
Pouch Layer (15) · Pouch Material (8) · Sticker Material (14) · Tin Box Material (2)

**Facets:**

| Group | Op | Options | Source column | Rows tagged |
|---|---|---|---|---|
| Sustainability | AND | Compostable, FSC® available, Recyclable, Recycled Content | `Filter - Sustainaibility (share with display property)` | 14 / 129 |
| Coating | OR | Coated, Uncoated | `Filter - Physical Properties` (split) | 14 / 129 |
| Fibre treatment | OR | Bleached, Dyed, Unbleached | `Filter - Physical Properties` (split) | 10 / 129 |
| Material source | OR | Recycled Fiber, Virgin Fiber | `Filter - Material Source` | 14 / 129 |
| Aesthetic | OR | Natural, Special Effect | `Filter - Aesthetic` | 7 / 129 |

Product line coverage: **113 / 129**.

## 6. Finishes — 90 rows

**Type** (from `Finishing Type`) — 11 options, 100% tagged:

Cutting (7) · Embossing & Debossing (11) · Foil Material (10) · Foiling Technique (4) ·
Food-safe Treatment (5) · Gluing (8) · Lamination (14) · Spot Coating (5) ·
Surface Coating (12) · Surface Finish (11) · Surface Finish · non-paper (3)

**Facets:**

| Group | Op | Options | Source column | Rows tagged |
|---|---|---|---|---|
| Coverage | OR | Full Surface, Spot Effect | `Attrib - Coverage` | 50 / 90 |
| Finish / effect | OR | Glitter, Gloss, Matte, Semi-Gloss, Soft Touch, Textured | `Attrib - Finish/Effect (not show on DP)` | 8 / 90 |

Product line coverage: **43 / 90**.

## 7. Printing — 29 rows

**Type** (from `Printing Option Type`) — 3 options, 100% tagged:

Color System (4) · Ink (15) · Printing Method (10)

**Facets: none render.** All three designed facets have zero tagged rows —
see §9.

Product line coverage: **21 / 29**.

## 8. Additional Customization — 68 rows

**Type** (from `Additional Customization Type`) — 7 options, 100% tagged:

Closures (15) · Embellishments (4) · Handles (16) · Opening & Access (12) ·
Reinforcement & Utility (10) · Technology (8) · Windows (3)

**Facets: none render.** See §9.

Product line coverage: **0 / 68** — see §9.

---

## 9. Data gaps — read this before scoping the work

The filter *logic* is complete. The blockers are all content-side.

**A. Attribute tagging is ~20% overall.** Only 64 of 316 rows carry any facet
value. The build deliberately **drops a facet group whose source column is
empty across every row**, rather than rendering an empty accordion — which is
why Printing and Additional Customization show no facets at all. These groups
are defined and will appear the moment data exists:

| Category | Defined but not rendering | Source column |
|---|---|---|
| Materials | Performance | `Filter - Performance (share with display property)` |
| Materials | Opacity | `Filter - Opacity` |
| Finishes | Sustainability | `Attrib - Sustainability` |
| Finishes | Performance | `Attrib - Performance` |
| Printing | Sustainability | `Attrib - Sustainability` |
| Printing | Ink composition | `Attrib - Composition (for ink)` |
| Printing | Ink effect | `Attrib - Effect (for ink) (not show on DP)` |
| Additional | Sustainability | `Attrib - Sustainability` |
| Additional | Physical properties | `Attrib - Physical Properties` |
| Additional | Performance | `Attrib - Performance` |

**B. `additional-customization.csv` has no `Applicable Product Types` column at
all.** Not empty — absent. So all 68 rows have zero product lines, they never
appear in Product Line results, and they never appear in a detail page's "Pairs
with". This needs a schema change in Notion/Sanity, not data entry.

**C. Subtype tagging is the one thing that is complete** — 100% across all four
categories. It is the most reliable axis in the dataset and worth leaning on
(the detail page's "Pairs with" groups by it for exactly this reason).

**Priority if you want the panel to feel useful:** fix B (schema), then tag
Sustainability across all four exports (it is the only global facet and the one
buyers filter by first), then Performance.

---

## 10. Where this lives in the POC

| Concern | File |
|---|---|
| Generator | `scripts/build-customizations.mjs` — `SOURCES` holds every facet definition |
| Generated data | `src/shared/data/customizations.generated.js` |
| Global facets, product lines | `src/shared/data/capabilities.js` |
| Panel UI | `src/shared/components/capability/CapabilityFilterSidebar.jsx` |
| Filter predicate, contextual counts | `src/pages/Capabilities.jsx` — `passesExcept()`, `facetCounts` |

Deep links are supported: `/customizations?category=<id>&line=<id,id>` sets the
initial category and product lines. Params are read on mount only; filter
changes do not currently rewrite the URL.
