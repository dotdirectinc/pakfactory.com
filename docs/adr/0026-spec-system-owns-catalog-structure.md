# ADR-026: The Spec System owns catalog structure after a record is created

**Status:** **Proposed** (2026-10-13) — decision taken by Richard on 2026-10-13 (option A below); becomes Accepted when Richard accepts this record. **Settles [ADR-025](0025-spec-system-owns-catalog-relations.md) § 7** ("Structure … gets its own record"). Applies to `admin`, `studio` and the Spec registry (`pakfactory.com-backend`). Tickets: PROD-2959 → PROD-3006 (server) · PROD-3007 (admin) · PROD-3008 (switch).

## Context

ADR-025 moved the customization **rules** to the Spec registry and left **structure** — which line a style belongs to, which style a product is under, which type an option belongs to — for its own decision. The open question it named: how does a record created in Studio get its parents?

Facts that shaped the decision (verified 2026-10-13):

- **The parent fields** (Studio schemas on `www-new-release`): `product.productLine`, `product.productStyle[]`, `product.basedOn` (inspiration products), `product.solutions[]`; `productStyle.productLine`; `customizationOption.type`; `customizationType.category`; `solutionStyle.solution`.
- **The registry already holds them.** Lines, styles, products, product ↔ style and product ↔ solution links, an option's type and a type's category are registry rows today, and Sync Changes (Sanity → registry) already carries them. Unlike the rules (PROD-2961), no mirror tables or import are needed.
- **Records are created in Studio**, with their content, media and SEO fields alongside the parents. Building record creation in the admin would mean rebuilding most of Studio's editor.
- **A move reaches further than it looks.** Moving a style to another line moves its products; a product's line and style decide which customizations it offers through the rules, so a move can change a product's offer.

## Decision

### 1. Option A: Studio creates; the Spec System moves

A new record is created in Studio, **with its parents**, as today. Once it is published, its parents change **only in the Spec System**.

*Not chosen — option B:* create records in the Spec System as well. It would make Studio read-only for structure entirely, but needs record creation in the admin (content, media, SEO), which is most of Studio again.

### 2. The same path as the rules

A move is a frame: edit → impact check → approve (or Submit & approve) → registry → immediate push to Sanity, with the existing check that never overwrites a newer Studio edit (ADR-025 §§ 2–4). Rule edits and moves share one pending set and can be submitted together.

### 3. A move carries its children, and the impact says so

Moving a record moves everything under it. Before submitting, the impact check lists the children that move and every standard product whose offered options change as a result, using the shared rules package (ADR-022 § 5). On the Spec Map a move can be made by dragging a card onto another parent; the diagram shows the result before saving.

### 4. Studio's validation is the server's validation

The rules Studio applies to the parent fields today are enforced by the structure edit API; a move Studio would refuse is refused before a frame exists.

### 5. A short trial, then the switch

Studio stays editable only while the path is proven on development. As soon as PROD-3006 and PROD-3007 pass there, the parent fields become **read-only in Studio once a record is published** (PROD-3008), behind a flag that can make them editable again; they stay editable while a record is being created.

### 6. The approved change wins; the most recent proposal wins

As amended in ADR-025 (2026-10-13), and for moves too:

- A move's Sanity items carry the change itself and are applied to each document as it is when written. A Studio change to the same parent field made since the proposal is shown to the approver, then overridden and recorded so it can be put back.
- A frame proposed **before** another frame was approved cannot undo what that frame changed: approval refuses it ("changed since this frame was proposed … sync again"). So a Sync Changes frame from before a Spec System move cannot put the old parent back in the registry.
- A Studio change made after the write stands until changed again; only the switch (§ 5) prevents it, which is why the switch follows the first end-to-end pass rather than a long trial.

### 7. Not decided here

- **Properties** (`properties`, property values) move under their own decision.
- **Creating records outside Studio** (option B) stays open for later.

## Consequences

**One editor per field after creation.** Editors keep creating records in Studio as today; moving one becomes a reviewed change with its reach shown first.

**Little new storage.** Structure already lives in the registry; the work is the edit API, the admin editor and the Studio switch.

**A record's first parents are unreviewed.** They are set in Studio on create, as today; every later change is reviewed.

**Reversible until the switch.** Before PROD-3008, abandoning this means removing the edit path; Studio never stopped working.

## References

- [ADR-025](0025-spec-system-owns-catalog-relations.md) — rules ownership; § 7 is settled here
- [ADR-022](0022-customization-rules-computed-not-stored.md) § 5 — the shared package the impact check runs
- `pakfactory.com-backend`: `scripts/lib/sanity-sync.mjs` (Sync Changes), `src/services/catalogSync/sanityApply.ts` (frame → Sanity, stale check), `src/services/spec/ruleEdits.ts` (the rule edit path this mirrors)
- Tickets: PROD-2959 · PROD-3006 (structure edit API) · PROD-3007 (admin editor, drag and drop, impact) · PROD-3008 (read-only switch)
